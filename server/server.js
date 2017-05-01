'use strict';

var express = require('express');

var ws = require('../pff');

var http_server = express();

//This resource makes it possible to download and start the WebSocket client
http_server.use(express.static(__dirname + "/../client"));

var connections = [];
var messages = [];

var ws_server = ws.createServer((connection) =>    {
    console.log('Opened a connection');
    connections.push(connection);

    messages.forEach((message) => {
        connection.send(message);
    });

    connection.on('message', (message) => {
        console.log("message received from a client: "+message);
        messages.push(message);

        ws_server.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(message);
            }
        });
    });

    connection.on('close', () => {
        console.log("Closed a connection");
    });

    connection.on('error', (error) => {
        console.error("Error: "+error.message);
    });
});

ws_server.listen(3001);

//Start the web server serving the WebSocket client
//Open http://localhost:3000 in a web browser
var server = http_server.listen(3000, () => {
  var host = server.address().address;
  var port = server.address().port;
  console.log('Example app listening at http://%s:%s', host, port);
});
