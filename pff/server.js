'use strict';

var util = require('util');
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

        var connectionListener = function(socket){
            var c = new Connection(socket, this, function (){
                that.connections.push(c)
                this.emit('connection', c);
            });
        };

        this.socket = net.createServer(options, connectionListener);


        this.connections = []

        events.EventEmitter.call(this)
        if (callback) {
            console.log(callback)

            this.socket.on('connection', callback)
        }

    }
}

Server.prototype.listen = function(port, host, callback){

    this.socket.listen(port, host, function() {
        this.emit('listening')
    })

    return this;

};

module.exports = Server;
