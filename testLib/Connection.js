'use strict';

var util = require('util');
var events = require('events');
var Server = require('./Server');

function Connection(socket, callback) {
    var connectionInstace = this;

    this.socket = socket;
    this.readyState = this.CONNECTING;
    this.protocol = undefined;
    this.buffer = new Buffer(0);

    socket.on('readable', function () {
        connectionInstace.doRead()
    })

    socket.on('error', function (err) {
        connectionInstace.emit('error', err)
    })

    events.EventEmitter.call(this)
    if (callback) {
        this.once('connect', callback)
    }
}

util.inherits(Connection, events.EventEmitter);
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