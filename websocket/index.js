'use strict';

var server = require('./Server');
var url = require('url');
var net = require('net');

exports.createServer = function (options, callback) {
	if (typeof options === 'function' || !arguments.length) {
		return new Server(false, options);
	}
	return new Server(Boolean(options.secure), options, callback);
};


exports.connect = function (URL, options, callback) {
	var socket

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

function parseWSURL (URL){
	var secure;
	var parts = url.parse(URL);

	parts.protocol = parts.protocol || 'ws:';
	if (parts.protocol === 'ws:') secure = false;
	else if (parts.protocol === 'wss:') secure = true;
	else throw new Error('parse Websocket url failed');

	parts.port = parts.port || (secure ? 443 : 80);
	parts.path = parts.path || '/';

	return {
		path: parts.path,
		port: parts.port,
		secure: secure,
		host: parts.hostname
	};
}