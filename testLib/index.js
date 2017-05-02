'use strict';

var net = require('net');
var url = require('url');

var server = require('./Server');
var connection = require('./Connection');

console.log('index.js started');

exports.createServer = (callback) => {
    return new server(callback)
};

exports.connect = (URL, callback) => {
    var socket
    var settings = url.parse(URL);

    socket = net.connect(settings);

    return new connection(socket, callback)
};