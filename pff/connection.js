'use strict';

module.exports = connection;

var events = require('events');
var server = require('./server');

function connection(socket, options, callback) {
    var connectionInstace = this;
    var connectEvent;

    this.server = options;



    this.socket = socket;
    this.readyState = this.CONNECTING;

    socket.on('read',()=>{

    });




}

connection.prototype.CONNECTING = 0;
connection.prototype.OPEN = 1;
connection.prototype.CLOSING = 2;
connection.prototype.CLOSED = 3;