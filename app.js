const express = require('express');
const server = express();
const port = 3000;
const fs = require('fs');
const wav = require('wav');
const pug = require('pug');
const BinaryServer = require('binaryjs').BinaryServer;
const winston = require('winston');
const http = require('http').Server(server);
const io = require('socket.io')(http);


server.locals.serverResponse = 'The Virtual Agents have nothing to say at the moment.';
server.locals.serverAudioUrl = '';

let counter = 0;

// logging to help debug server
let logger = new (winston.Logger)({
    transports: [
        new (winston.transports.Console)(),
        new (winston.transports.File)({ filename: './logs/server-log.log' })
    ]
});

// using a web page and saving as a file locally for now
// TODO - switch to an API call and store data in a database

server.set('view engine', 'pug');
server.use(express.static(__dirname + '/public'));


// server.get('/', function(req, res) {
//     res.render('index');
// })

// io.on('connection', function(socket) {
//     console.log('user connected');
//     socket.on('chat message', function(msg) {
//         io.emit('chat message', msg);
//     });
//     socket.on('disconnect', function() {
//         console.log('user disconnected');
//     });
// });

// http.listen(3000, function() {
//     console.log('listening on *:3000');
// });

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
    let audioFileName = './audio-recordings/audio-' + counter + '.wav';
    let audioFileWriter = new wav.FileWriter(audioFileName, {
        channels: 1,
        sampleRate: 48000,
        bitDepth: 16
    });

    // write to the audio file 
    client.on('stream', (stream, meta) => {
        if (stream.id == 0) {
            logger.log('info', 'New audio stream started');
            stream.pipe(audioFileWriter);

            // TODO - change to listen for a different sign to avoid having the client refresh the page
            stream.on('end', () => {
                audioFileWriter.end();
                logger.log('info', 'Audio stream ended. Audio saved in file ' + audioFileName);
                counter++;
                server.locals.serverResponse = 'The Virtual Agents have some advice for you to help you collaborate better!';
                server.locals.serverAudioUrl = 'server_audio.wav';
                // server.locals.serverResponse = 'Audio recorded, saved as ' + audioFileName;
            });
        }
    });

    // set up write stream for programming logging data
    let sessionLogFileName = './logs/-session' + counter + '-log.log';
    let logFileWriteStream = fs.createWriteStream(sessionLogFileName);

    // write to programming logs
    client.on('stream', (stream, meta) => {
        if (stream.id != 0) {
            logger.log('info', 'New programming log stream started');
            // logFileWriteStream.write('New programming log stream started \n');
            stream.pipe(logFileWriteStream);

            stream.on('end', () => {
                let tempDate = new Date();
                let currDate = tempDate.toLocaleString("en-US");
                logFileWriteStream.write(currDate + " --- INFO --- Session log stream ended. Programming log saved in file " + sessionLogFileName + ' \n');
                logFileWriteStream.end();
                logger.log('info', 'Session log stream ended. Programming log saved in file ' + sessionLogFileName);
            })
        }
    });
});
