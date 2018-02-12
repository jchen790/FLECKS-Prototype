const express = require('express');
const app = express();
const port = 3000;
let counter = 0;

// using a web page and saving as a file locally for now
// TODO - switch to an API call and store data in a database
const fs = require('fs');
const wav = require('wav');
const pug = require('pug');
const BinaryServer = require('binaryjs').BinaryServer;
app.set('view engine', 'pug');
app.use(express.static(__dirname + '/scripts'));


app.get('/', (request, response) => {
    response.render('index');
});

app.listen(3000, () => console.log('Server listening on port 3000!'));

// set up connection to client
server = BinaryServer({port: 9001});

server.on('connection', (client) => {
    console.log('Connection established with client!');

    let filename = 'audio-' + counter + '.wav';
    let fileWriter = new wav.FileWriter(filename, {
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
        });

        client.on('close', () => {
            if(fileWriter != null)
            {
                fileWriter.end();
            }
        });
    })
})