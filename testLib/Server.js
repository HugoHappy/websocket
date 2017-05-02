'use strict'

function nop() {}

var util = require('util');
var net = require('net');
var events = require('events')
var Connection = require('./Connection');

function Server(callback) {
    var that = this

    var onConnection = function (socket) {
        var conn = new Connection(socket, that, function () {
            that.connections.push(conn)
            conn.removeListener('error', nop)
            that.emit('connection', conn)
        })
        conn.on('close', function () {
            var pos = that.connections.indexOf(conn)
            if (pos !== -1) {
                that.connections.splice(pos, 1)
            }
        })

        // Ignore errors before the connection is established
        conn.on('error', nop)
    }

    this.socket = net.createServer(onConnection)


    this.socket.on('close', function () {
        that.emit('close')
    })
    this.socket.on('error', function (err) {
        that.emit('error', err)
    })
    this.connections = []

    // super constructor
    events.EventEmitter.call(this)
    if (callback) {
        this.on('connection', callback)
    }
}

util.inherits(Server, events.EventEmitter)
module.exports = Server

Server.prototype.listen = function (port, host, callback) {
    var that = this

    if (typeof host === 'function') {
        callback = host
        host = undefined
    }

    if (callback) {
        this.on('listening', callback)
    }

    this.socket.listen(port, host, function () {
        that.emit('listening')
    })

    return this
}

Server.prototype.close = function (callback) {
    if (callback) {
        this.once('close', callback)
    }
    this.socket.close()
}