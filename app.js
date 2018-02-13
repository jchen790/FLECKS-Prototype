const express = require('express');
const fs = require('fs');
const wav = require('wav');
const pug = require('pug');
const BinaryServer = require('binaryjs').BinaryServer;
const winston = require('winston');

const server = express();
const port = 3000;

let counter = 0;

// logging to help debug server
let logger = new(winston.Logger)({
    transports: [
        new(winston.transports.Console)(),
        new(winston.transports.File)({filename: './logs/server-log.log'})
    ]
});

// using a web page and saving as a file locally for now
// TODO - switch to an API call and store data in a database

server.set('view engine', 'pug');
server.use(express.static(__dirname + '/public'));


server.get('/', (request, response) => {
    response.render('index');
});

server.listen(port, () => {
    logger.log('info', '***********************SERVER HAS (RE)STARTED***********************');
    logger.log('info', 'Server listening on port 3000');
});

// set up connection to client
binaryServer = BinaryServer({ port: 9001 });

binaryServer.on('connection', (client) => {
    logger.log('info', 'Connection established with client');

    // set up file writer for when we receive the audio stream 
    let filename = './audio-recordings/audio-' + counter + '.wav';
    let fileWriter = new wav.FileWriter(filename, {
        channels: 1,
        sampleRate: 48000,
        bitDepth: 16
    });

    // write to the audio file 
    client.on('stream', (stream, meta) => {
        logger.log('info', 'New stream started');
        stream.pipe(fileWriter);

        // TODO - change to listen for a different sign to avoid having the client refresh the page
        stream.on('end', () => {
            fileWriter.end();
            logger.log('info', 'Stream ended. Audio saved in file ' + filename);
            counter++;
        });
    });
});
