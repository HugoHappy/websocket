'use strict';

var events = require('events');
var crypto = require('crypto');
var Server = require('./Server');
var Frame = require('./Frame');

class Connection{
    constructor(socket, options, callback) {
        var that = this;
        var connectEvent;

        if (options instanceof Server.constructor) {
            // Server-side connection
            this.server = options
            this.path = null
            this.host = null
            this.extraHeaders = null
            this.protocols = []
        } else {
            // Client-side
            this.server = null
            this.path = options.path
            this.host = options.host
            this.extraHeaders = options.extraHeaders
            this.protocols = options.protocols || []
        }
        this.protocol = undefined;
        this.socket = socket;
        this.readyState = this.CONNECTING;
        this.buffer = new Buffer(0);
        this.frameBuffer = null; // string for text frames and InStream for binary frames
        this.outStream = null; // current allocated OutStream object for sending binary frames
        this.key = null; // the Sec-WebSocket-Key header
        this.headers = {}; // read only map of header names and values. Header names are lower-cased

        // Set listeners
        socket.on('readable', function () {
            that.doRead();
        });


        socket.on('error', function (err) {
            this.emit('error', err);
        });


        if (!this.server) {
            connectEvent = socket.constructor.name === 'CleartextStream' ? 'secureConnect' : 'connect'
            socket.on(connectEvent, function () {
                that.startHandshake();
            })
        }

        // Close listeners
        var onclose = function () {
            console.log("onclose runned");
            if (that.readyState === that.CONNECTING || that.readyState === that.OPEN) {
                that.emit('close', 1006, '')
            }
            that.readyState = this.CLOSED;
        };
        socket.once('close', onclose);
        socket.once('finish', onclose);

        // super constructor
        events.EventEmitter.call(this);
        if (callback) {
            this.socket.once('connect', callback);
        }
    }
}

module.exports = Connection;

Connection.prototype.CONNECTING = 0;
Connection.prototype.OPEN = 1;
Connection.prototype.CLOSING = 2;
Connection.prototype.CLOSED = 3;

Connection.prototype.doRead = function () {
    var buffer, temp

    // Fetches the data
    buffer = this.socket.read()
    if (!buffer) {
        // Waits for more data
        return
    }

    // Save to the internal buffer
    this.buffer = Buffer.concat([this.buffer, buffer], this.buffer.length + buffer.length)

    if (this.readyState === this.CONNECTING) {
        if (!this.readHandshake()) {
            // May have failed or we're waiting for more data
            return
        }
    }

    if (this.readyState !== this.CLOSED) {
        // Try to read as many frames as possible
        while ((temp = this.extractFrame()) === true) {}
        if (temp === false) {
            // Protocol error
            this.close(1002)
        } else if (this.buffer.length > Connection.maxBufferLength) {
            // Frame too big
            this.close(1009)
        }
    }
}

Connection.prototype.readHandshake = function () {
    var found = false,
        i, data

    // Do the handshake and try to connect
    if (this.buffer.length > Connection.maxBufferLength) {
        // Too big for a handshake
        if (this.server) {
            this.socket.end('HTTP/1.1 400 Bad Request\r\n\r\n')
        } else {
            this.socket.end()
            this.emit('error', new Error('Handshake is too big'))
        }
        return false
    }

    // Search for '\r\n\r\n'
    for (i = 0; i < this.buffer.length - 3; i++) {
        if (this.buffer[i] === 13 && this.buffer[i + 2] === 13 &&
            this.buffer[i + 1] === 10 && this.buffer[i + 3] === 10) {
            found = true
            break
        }
    }
    if (!found) {
        // Wait for more data
        return false
    }
    data = this.buffer.slice(0, i + 4).toString().split('\r\n')
    if (this.server ? this.answerHandshake(data) : this.checkHandshake(data)) {
        this.buffer = this.buffer.slice(i + 4)
        this.readyState = this.OPEN
        this.socket.emit('connect')
        return true
    } else {
        this.socket.end(this.server ? 'HTTP/1.1 400 Bad Request\r\n\r\n' : undefined)
        return false
    }
}


Connection.prototype.extractFrame = function () {
    var fin, opcode, B, HB, mask, len, payload, start, i, hasMask

    if (this.buffer.length < 2) {
        return
    }

    // Is this the last frame in a sequence?
    B = this.buffer[0]
    HB = B >> 4
    if (HB % 8) {
        // RSV1, RSV2 and RSV3 must be clear
        return false
    }
    fin = HB === 8
    opcode = B % 16

    if (opcode !== 0 && opcode !== 1 && opcode !== 2 &&
        opcode !== 8 && opcode !== 9 && opcode !== 10) {
        // Invalid opcode
        return false
    }
    if (opcode >= 8 && !fin) {
        // Control frames must not be fragmented
        return false
    }

    B = this.buffer[1]
    hasMask = B >> 7
    if ((this.server && !hasMask) || (!this.server && hasMask)) {
        // Frames sent by clients must be masked
        return false
    }
    len = B % 128
    start = hasMask ? 6 : 2

    if (this.buffer.length < start + len) {
        // Not enough data in the buffer
        return
    }

    // Get the actual payload length
    if (len === 126) {
        len = this.buffer.readUInt16BE(2)
        start += 2
    } else if (len === 127) {
        // Warning: JS can only store up to 2^53 in its number format
        len = this.buffer.readUInt32BE(2) * Math.pow(2, 32) + this.buffer.readUInt32BE(6)
        start += 8
    }
    if (this.buffer.length < start + len) {
        return
    }

    // Extract the payload
    payload = this.buffer.slice(start, start + len)
    if (hasMask) {
        // Decode with the given mask
        mask = this.buffer.slice(start - 4, start)
        for (i = 0; i < payload.length; i++) {
            payload[i] ^= mask[i % 4]
        }
    }
    this.buffer = this.buffer.slice(start + len)

    // Proceeds to frame processing
    return this.processFrame(fin, opcode, payload)
}

Connection.prototype.processFrame = function (fin, opcode, payload) {
    if (opcode === 8) {
        // Close frame
        if (this.readyState === this.CLOSING) {
            this.socket.end()
        } else if (this.readyState === this.OPEN) {
            this.processCloseFrame(payload)
        }
        return true
    } else if (opcode === 9) {
        // Ping frame
        if (this.readyState === this.OPEN) {
            this.socket.write(Frame.createPongFrame(payload.toString(), !this.server))
        }
        return true
    } else if (opcode === 10) {
        // Pong frame
        this.emit('pong', payload.toString())
        return true
    }

    if (this.readyState !== this.OPEN) {
        // Ignores if the connection isn't opened anymore
        return true
    }

    if (opcode === 0 && this.frameBuffer === null) {
        // Unexpected continuation frame
        return false
    } else if (opcode !== 0 && this.frameBuffer !== null) {
        // Last sequence didn't finished correctly
        return false
    }

    if (!opcode) {
        // Get the current opcode for fragmented frames
        opcode = typeof this.frameBuffer === 'string' ? 1 : 2
    }

    if (opcode === 1) {
        // Save text frame
        payload = payload.toString()
        this.frameBuffer = this.frameBuffer ? this.frameBuffer + payload : payload

        if (fin) {
            // Emits 'text' event
            this.socket.emit('text', this.frameBuffer)
            this.frameBuffer = null
        }
    } else {
        // Sends the buffer for InStream object
        if (!this.frameBuffer) {
            // Emits the 'binary' event
            this.frameBuffer = new InStream
            this.emit('binary', this.frameBuffer)
        }
        this.frameBuffer.addData(payload)

        if (fin) {
            // Emits 'end' event
            this.frameBuffer.end()
            this.frameBuffer = null
        }
    }

    return true
}

Connection.prototype.sendText = function (str, callback) {
    if (this.readyState === this.OPEN) {
        if (!this.outStream) {
            return this.socket.write(Frame.createTextFrame(str, !this.server), callback)
        }
        this.socket.emit('error', new Error('You can\'t send a text frame until you finish sending binary frames'))
    } else {
        this.socket.emit('error', new Error('You can\'t write to a non-open connection'))
    }
}


/**
 * Process a close frame, emitting the close event and sending back the frame
 * @param {Buffer} payload
 * @fires close
 * @private
 */
Connection.prototype.processCloseFrame = function (payload) {
    var code, reason
    if (payload.length >= 2) {
        code = payload.readUInt16BE(0)
        reason = payload.slice(2).toString()
    } else {
        code = 1005
        reason = ''
    }
    this.socket.write(Frame.createCloseFrame(code, reason, !this.server))
    this.readyState = this.CLOSED
    this.socket.emit('close', code, reason)
}



Connection.prototype.readHeaders = function (lines) {
    var i, match

    // Extract all headers
    // Ignore bad-formed lines and ignore the first line (HTTP header)
    for (i = 1; i < lines.length; i++) {
        if ((match = lines[i].match(/^([a-z-]+): (.+)$/i))) {
            this.headers[match[1].toLowerCase()] = match[2]
        }
    }
}

Connection.prototype.answerHandshake = function (lines) {
    var path, key, sha1, headers

    // First line
    if (lines.length < 6) {
        return false
    }
    path = lines[0].match(/^GET (.+) HTTP\/\d\.\d$/i)
    if (!path) {
        return false
    }
    this.path = path[1]

    // Extract all headers
    this.readHeaders(lines)

    // Validate necessary headers
    if (!('host' in this.headers) ||
        !('sec-websocket-key' in this.headers) ||
        !('upgrade' in this.headers) ||
        !('connection' in this.headers)) {
        return false
    }
    if (this.headers.upgrade.toLowerCase() !== 'websocket' ||
        this.headers.connection.toLowerCase().split(', ').indexOf('upgrade') === -1) {
        return false
    }
    if (this.headers['sec-websocket-version'] !== '13') {
        return false
    }

    this.key = this.headers['sec-websocket-key']

    // Agree on a protocol
    if ('sec-websocket-protocol' in this.headers) {
        // Parse
        this.protocols = this.headers['sec-websocket-protocol'].split(',').map(function (each) {
            return each.trim()
        })

        // Select protocol
        if (this.server._selectProtocol) {
            this.protocol = this.server._selectProtocol(this, this.protocols)
        }
    }

    // Build and send the response
    sha1 = crypto.createHash('sha1')
    sha1.end(this.key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11')
    key = sha1.read().toString('base64')
    headers = {
        Upgrade: 'websocket',
        Connection: 'Upgrade',
        'Sec-WebSocket-Accept': key
    }
    if (this.protocol) {
        headers['Sec-WebSocket-Protocol'] = this.protocol
    }
    this.socket.write(this.buildRequest('HTTP/1.1 101 Switching Protocols', headers))
    return true
}


Connection.prototype.buildRequest = function (requestLine, headers) {
    var headerString = requestLine + '\r\n',
        headerName

    for (headerName in headers) {
        headerString += headerName + ': ' + headers[headerName] + '\r\n'
    }

    return headerString + '\r\n'
}