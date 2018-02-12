const express = require('express');
const fs = require('fs');
const wav = require('wav');
const pug = require('pug');
const WebSocket = require('ws');
const BinaryServer = require('binaryjs').BinaryServer;

const server = express();
const port = 3000;

let counter = 0;
let filename = './audio-recordings/audio-' + counter + '.wav';

// using a web page and saving as a file locally for now
// TODO - switch to an API call and store data in a database

server.set('view engine', 'pug');
server.use(express.static(__dirname + '/public'));


server.get('/', (request, response) => {
    response.render('index');
});

server.listen(port, () => console.log('Server listening on port 3000!'));

// set up connection to client
binaryServer = BinaryServer({ port: 9001 });

binaryServer.on('connection', (client) => {
    console.log('Connection established with client!');

    var fileWriter = new wav.FileWriter(filename, {
        channels: 1,
        sampleRate: 48000,
        bitDepth: 16
    });

    client.on('stream', (stream, meta) => {
        console.log('New stream started!');
        stream.pipe(fileWriter);

        stream.on('end', () => {
            fileWriter.end();
            console.log("Stream ended. Audio saved in file " + filename);
            counter++;
        });
    });
});
