// Logging enums and debugging flags
var LOG = {
    Error: 0,
    Info: 1,
    Debug: 2
};
var DEBUG = true;

// Server variables
var connectedUsers = 0;
const port = 8080;

// Imported packages
"use strict";
require('es6-promise').polyfill();
const app = require('express')();
const http = require('http').Server(app);
const httpClient = require('http');
const https = require('https');
const path = require("path");
const fs = require("fs");
const io = require('socket.io')(http);
const ss = require('socket.io-stream');
const urlParse  = require('url').parse;
const googleTTS = require('google-tts-api');

// Functions for GET requests
app.get('/', function (req, res) {
    res.sendFile(__dirname + '/index.html');
});

app.get('/script.js', function (req, res) {
    res.sendFile(__dirname + '/js/script.js');
});

app.get('/recordrtc/RecordRTC.js', function (req, res) {
    res.sendFile(__dirname + '/js/recordrtc/RecordRTC.js');
});

app.get('/socket.io-stream.js', function (req, res) {
    res.sendFile(__dirname + '/js/socket.io-stream.js');
});

app.get('/styles.css', function (req, res) {
    res.sendFile(__dirname + '/styles.css');
});

app.get('/agents.png', function (req, res) {
    res.sendFile(__dirname + '/agents.png');
});

// Set up write streams for logs
let sessionLogFileName = './logs/session-' + Date.now() + '.log';
let sessionLogFileWriteStream = fs.createWriteStream(sessionLogFileName);
let serverLogFileName = './logs/debugging/server-' + Date.now() + '.log';
let serverLogFileWriteStream = fs.createWriteStream(serverLogFileName);

// Use socket.io and socket.io-stream libraries to stream and emit data
io.sockets.on('connection', function (socket) {
    socket.username = "";
    connectedUsers++;

    if (DEBUG) {
        console.log('> a user connected');
    }

    writeToServerLog(LOG.Debug, "A user connected");

    // New user connected - log user
    socket.on('new_user', function (username) {
        socket.username = username;
        socket.emit('user_acked', 'You are connected!');

        if (DEBUG) {
            console.log('>>> ' + socket.username + ' has connected');
        }

        writeToServerLog(LOG.Info, socket.username + " is now connected");
        writeToSessionLog(LOG.Info, socket.username + " is now connected");
    });

    // Collect audio stream
    socket.on('audio', function (data) {
        let fileName = socket.username + '-' + Date.now();
        socket.audioFileName = fileName + '.wav';

        writeAudioFile(data.audio.dataURL, fileName + '.wav');
    });

    // Send audio response to all clients upon request
    socket.on('request_response', function (data) {
        if (DEBUG) {
            console.log('> audio response requested');
        }

        writeToServerLog(LOG.Info, socket.username + " requested an audio response from server");

        // let stream = ss.createStream();
        // let fileName = __dirname + '/server-audio0.wav';

        writeToServerLog(LOG.Debug, "Server is returning " + fileName);

        // Broadcast audio to all connected clients
        for (var i in io.sockets.connected) {
            let clientSocket = io.sockets.connected[i];
            let stream = ss.createStream();
            ss(clientSocket).emit('audio-stream', stream, { name: fileName });
            fs.createReadStream(fileName).pipe(stream);
        }

        writeToServerLog(LOG.Debug, "Server has written to the audio to stream");
    });

    // Send final audio to a client upon request
    socket.on('request_final', function (data) {
        if (DEBUG) {
            console.log('> audio file requested');
        }

        writeToServerLog(LOG.Info, socket.username + " requested an audio response from server");

        let stream = ss.createStream();
        let fileName = __dirname + '/audio-recordings/' + socket.audioFileName;

        writeToServerLog(LOG.Debug, "Server is returning " + fileName);

        ss(socket).emit('file', stream, { name: fileName });
        fs.createReadStream(fileName).pipe(stream);

        writeToServerLog(LOG.Debug, "Server has written to the audio to stream");
    });

    // Write to log file
    socket.on('log', function (message) {
        sessionLogFileWriteStream.write(message);
    });

    // Log information when user disconnects
    socket.on('disconnect', function (message) {
        writeToServerLog(LOG.Info, socket.username + " has disconnected");
        writeToSessionLog(LOG.Info, socket.username + " has disconnected");
        connectedUsers--;
        resetSessionLog(connectedUsers);
    });

    // Writes incoming data to an audio file
    function writeAudioFile(dataURL, fileName) {
        let audioFileName = './audio-recordings/' + fileName;
        dataURL = dataURL.split(',').pop();
        let fileBuffer = new Buffer(dataURL, 'base64');
        fs.writeFileSync(audioFileName, fileBuffer);

        if (DEBUG) {
            console.log('> audio file saved as ' + audioFileName);
        }

        writeToServerLog(LOG.Info, "Audio file is saved at " + audioFileName);
        writeToSessionLog(LOG.Info, "Audio file is saved at " + audioFileName);

        testing(getFileSize(audioFileName, 'KB'));
    }

    // Writes to local file
    function downloadAudioResponse (url, dest) {
        return new Promise(function (resolve, reject) 
        {
        let info = urlParse(url);
        let httpClientVar;
        if (info.protocol === 'https:')
        {
            httpClientVar = https;
        }
        else
        {
            httpClientVar = http;
        }
        let options = 
        {
            host: info.host,
            path: info.path
        };
    
        httpClientVar.get(options, function(res) 
        {
            // check status code
            if (res.statusCode !== 200) 
            {
                console.log(res.statusCode);
            reject(new Error('request to ' + url + ' failed'));
            return;
            }
    
            let file = fs.createWriteStream(dest);
            file.on('finish', function() 
            {
            // close() is async, call resolve after close completes.
            // let stream = ss.createStream();
                    let responseFileName = './audio-recordings/server-response.mp3';

                    // // writeToServerLog(LOG.Debug, "Server is returning " + fileName);

                    // ss(socket).emit('test1', stream, { name: responseFileName });
                    // fs.createReadStream(responseFileName).pipe(stream);

// Broadcast audio to all connected clients
for (var i in io.sockets.connected) {
    let clientSocket = io.sockets.connected[i];
    let stream = ss.createStream();
    ss(clientSocket).emit('audio-stream', stream, { name: responseFileName });
    fs.createReadStream(responseFileName).pipe(stream);
}

            file.close(resolve);
            });

            file.on('error', function (err) 
            {
            // Delete the file async. (But we don't check the result)
            fs.unlink(dest);
            reject(err);
            });
    
            res.pipe(file);
        })
        .on('error', function(err) {
            reject(err);
        })
        .end();
        });
    }

        function testing(time) 
        {
            googleTTS('file size of ' + time, 'en', 1)   // speed normal = 1 (default), slow = 0.24
                .then(function (url) {
                    testURL = url;
                    console.log(url); // https://translate.google.com/translate_tts?...
                    socket.emit('test', testURL);

                    console.log(url);
                    let responseFileName = './audio-recordings/server-response.mp3';
                    downloadAudioResponse(url, responseFileName);
                })
                .then(function () {
                    console.log('download success');
                    // let stream = ss.createStream();
                    // let responseFileName = './audio-recordings/server-response.mp3';

                    // // writeToServerLog(LOG.Debug, "Server is returning " + fileName);

                    // ss(socket).emit('test1', stream, { name: responseFileName });
                    // fs.createReadStream(responseFileName).pipe(stream);
                })
                .catch(function (err) {
                    console.error(err.stack);
                });
        }
    });

// Serve on assigned port
http.listen(port, function () {
    console.log("Server is listening on port " + port);
    writeToServerLog(LOG.Debug, "Server is now listening");
});

// Writes data to a server log (primarily for debugging the server code)
function writeToServerLog(type, logString) {
    let tempDate = new Date();
    // TODO - update to school's locale
    let currDate = tempDate.toLocaleString("en-US");

    let typeString = "";
    if (type === LOG.Error) {
        typeString = "ERROR";
    }
    else if (type === LOG.Info) {
        typeString = "INFO";
    }
    else if (type === LOG.Debug) {
        typeString = "DEBUG";
    }
    else {
        typeString = "LOG";
    }

    serverLogFileWriteStream.write(currDate + " --- " + typeString + " --- " + logString + ' \n');
}

// Writes data to the session log
function writeToSessionLog(type, logString) {
    let tempDate = new Date();
    // TODO - update to school's locale
    let currDate = tempDate.toLocaleString("en-US");

    let typeString = "";
    if (type === LOG.Error) {
        typeString = "ERROR";
    }
    else if (type === LOG.Info) {
        typeString = "INFO";
    }
    else if (type === LOG.Debug) {
        typeString = "DEBUG";
    }
    else {
        typeString = "LOG";
    }

    sessionLogFileWriteStream.write(currDate + " --- " + typeString + " --- " + logString + ' \n');
}

// Ends the session log if there are no more clients, resets it for the next connecting clients
function resetSessionLog(numUsers) {
    if (numUsers === 0) {
        writeToSessionLog(LOG.Info, "Session has ended, there are no more participants");
        sessionLogFileWriteStream.end();
        writeToServerLog(LOG.Info, "Session log saved at " + sessionLogFileName);

        // Start new session log file stream
        sessionLogFileName = './logs/session-' + Date.now() + '.log';
        sessionLogFileWriteStream = fs.createWriteStream(sessionLogFileName);
    }
}

// Gets file size in requested units
function getFileSize(fileName, unit)
{
    let stats = fs.statSync(fileName);
    let tempFileSize = stats.size;

    let fileSize = tempFileSize;
    if(unit === "KB")
    {
        fileSize = tempFileSize / 1000;
    }
    else if (unit === "MB")
    {
        fileSize = tempFileSize / 1000000;
    }
    else if (unit === "GB")
    {
        fileSize = tempFileSize / 1000000000;
    }
    
    return fileSize;
}

