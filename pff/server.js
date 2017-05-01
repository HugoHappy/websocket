'use strict';

module.exports = server;

var util = require('util');
var net = require('net');

function server(callback) {
    var serverInstace = this;



}


server.prototype.listen = (port, host, callback) => {
    var listenInstace = this;

    if (callback) {
        this.on('listening', callback)
    }

    this.socket.listen(port, host, () =>{
        that.emit('listening')
    });

    return this;
};