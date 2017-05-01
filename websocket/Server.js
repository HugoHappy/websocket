'use strict'

module.exports = Server;

var util = require('util');
var net = require('net');
var tls = require('tls');
var events = require('events');
var Connection;

function Server(options){
   var serverInstance = this;

    var connected = function(socket){
        var connection = new Connection(socket, serverInstance, )
    };


    this.socket = net.createServer(options, connected);

}