'use strict';

var net = require('net');
var events = require('events');
var Connection = require('./Connection');

class Server{
    constructor(options, callback) {
        var that = this;

        if(typeof options === "function"){
            callback = options;
            options = undefined;
        }

        var nop = function () {};

        var connectionListener = function(socket){
            var c = new Connection(socket, this, function (){
                that.connections.push(c);
                //c.socket.removeListener('error', nop);
                this.emit('connection', c);
            });

            c.socket.on('close', function () {
                var pos = that.connections.indexOf(c);
                if (pos !== -1) {
                    that.connections.splice(pos, 1);
                }
            });

            // Ignore errors before the connection is established
            c.socket.on('error', nop)

        };

        this.socket = net.createServer(options, connectionListener);

        this.socket.on('close', function () {
            that.emit('close')
        });

        this.socket.on('error', function (err) {
            that.emit('error', err)
        });

        this.connections = [];

        events.EventEmitter.call(this);

        if (callback) {
            this.socket.on('connection', callback)
        }
    }
}

Server.prototype.listen = function(port, host, callback){
    if (typeof host === 'function') {
        callback = host
        host = undefined
    }

    if (callback) {
        this.on('listening', callback);
    }

    this.socket.listen(port, host, function () {
        this.emit('listening');
    });

    return this;

};

Server.prototype.close = function (callback) {
    if (callback) {
        this.once('close', callback);
    }
    this.socket.close();
}

module.exports = Server;
