'use strict';

var net = require('net');
var url = require('url');

var Server = require('./Server');
//var Connection = require('./Connection');

console.log('index.js started');

exports.createServer = function(options, callback){
    console.log(options);
    console.log(callback)
    return new Server(options, callback)
};

/*
exports.connect = (URL, options, callback) => {
    var socket

    console.log('666')

    if (typeof options === 'function') {
        callback = options
        options = undefined
    }
    options = options || {}

    var connectionOptions = parseWSURL(URL)
    options.port = connectionOptions.port
    options.host = connectionOptions.host

    connectionOptions.extraHeaders = options.extraHeaders
    connectionOptions.protocols = options.protocols

    if (connectionOptions.secure) {
        socket = tls.connect(options)
    } else {
        socket = net.connect(options)
    }

    return new Connection(socket, connectionOptions, callback)
}
*/

function parseWSURL(URL) {
    var parts, secure

    parts = url.parse(URL)

    parts.protocol = parts.protocol || 'ws:'
    if (parts.protocol === 'ws:') {
        secure = false
    } else if (parts.protocol === 'wss:') {
        secure = true
    } else {
        throw new Error('Invalid protocol ' + parts.protocol + '. It must be ws or wss')
    }

    parts.port = parts.port || (secure ? 443 : 80)
    parts.path = parts.path || '/'

    return {
        path: parts.path,
        port: parts.port,
        secure: secure,
        host: parts.hostname
    }
}