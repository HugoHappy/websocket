'use strict';

var net = require('net');
var url = require('url');
var Server = require('./Server');

console.log('index.js started');

exports.createServer = function(options, callback){
    return new Server(options, callback)
};