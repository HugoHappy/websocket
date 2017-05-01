'use strict'

module.exports = Connection;

var util = require('util');
var server = require('./Server');
var events = require('events');

function Connection(socket, callback){

    var connectionInstace = this;

	this.server = serverOrClient
	this.path = null
	this.host = null
	this.extraHeaders = null
	this.protocols = []

	this.socket = socket;

	socket.on(' ', (what)=>{
		connectionInstace.read();
	});

};

/*
Connection.prototype.startHandshake = function () {
    var headers;
    var header;

    var key = new Buffer(16);
	for(var i = 0; i<16; i++){
		key[i] = Math.floor(Math.random() * 256);
	}
	this.key = key.toString('base64');

	var handshake = 'GET ' + this.path + ' HTTP/1.1 \r\n'+
					'Host: ' + this.host + '\r\n'+
					'Connection: Upgrade \r\n'+
					'Sec-Websocket-Key: ' + this.key + '\r\n'+
					'';

	console.log(handshake);
	this.socket.write(handshake);
}
*/

Connection.prototype.read = function(){
	var buffer;

	buffer = this.socket.read();
	if(!buffer)return;

	this.buffer = Buffer.concat([this.buffer, buffer])


};



Connection.prototype.readHandshake = function(){
	var found = false;




};


Connection.prototype.buildRequest = function (requestLine, headers) {
	var headerString = requestLine + '\r\n',
		headerName

	for (headerName in headers) {
		headerString += headerName + ': ' + headers[headerName] + '\r\n'
	}

	return headerString + '\r\n'
}
