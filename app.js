// Logging enums and debugging flags
var LOG = {
    Error: 0,
    Info: 1,
    Debug: 2
};
var DEBUG = true;

// Server variables
var currLocale = 'en-US';
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
const urlParse = require('url').parse;
const googleTTS = require('google-tts-api');

/*********************************************************************************************************
 * 
 * Functions for GET requests
 * 
 ********************************************************************************************************/

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

/*********************************************************************************************************
 * 
 * Setting up write streams for logs
 * 
 ********************************************************************************************************/

let sessionLogFileName = './logs/session-' + Date.now() + '.log';
let sessionLogFileWriteStream = fs.createWriteStream(sessionLogFileName);
let serverLogFileName = './logs/debugging/server-' + Date.now() + '.log';
let serverLogFileWriteStream = fs.createWriteStream(serverLogFileName);

/*********************************************************************************************************
 * 
 * Using socket.io and socket.io-stream libraries to stream and emit data
 * 
 ********************************************************************************************************/

io.sockets.on('connection', function (socket) {
    socket.username = "";
    connectedUsers++;

    if (DEBUG) {
        console.log('> a user connected');
    }

    writeToServerLog(LOG.Debug, "A user connected");

    // Log the newly connected user
    socket.on('new_user', function (username) {
        socket.username = username;
        socket.emit('user_acked', 'You are connected!');

        if (DEBUG) {
            console.log('>>> ' + socket.username + ' has connected');
        }

        writeToServerLog(LOG.Info, socket.username + " is now connected");
        writeToSessionLog(LOG.Info, socket.username + " is now connected");
    });

    // Collect client audio stream
    socket.on('audio', function (data) {
        let fileName = socket.username + '-' + getCurrentDateTime();
        socket.audioFileName = fileName + '.wav';

        writeClientAudioFile(data.audio.dataURL, fileName + '.wav');
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

    // Writes incoming data to an audio file and sends to client
    function writeClientAudioFile(dataURL, fileName) {
        let audioFileName = './audio-recordings/' + fileName;
        dataURL = dataURL.split(',').pop();
        let fileBuffer = new Buffer(dataURL, 'base64');
        fs.writeFileSync(audioFileName, fileBuffer);

        if (DEBUG) {
            console.log('> audio file saved as ' + audioFileName);
        }

        writeToServerLog(LOG.Info, "Audio file is saved at " + audioFileName);
        writeToSessionLog(LOG.Info, "Audio file is saved at " + audioFileName);

        sendAudioResponse(getFileSize(audioFileName, 'KB') + ' kilobytes');
    }

    // Get audio response and send to client
    function sendAudioResponse(fileSize) {
        let tempDate = new Date();
        let currDate = tempDate.toLocaleString(currLocale);
        let audioString = 'File has been received at ' + currDate + ' from user ' + socket.username + ' with file size of ' + fileSize;
        googleTTS(audioString, currLocale, 1)
            .then(function (url) {
                if (DEBUG) {
                    console.log(url);
                }

                writeToServerLog(LOG.Info, 'Audio response at ' + url + " which says '" + audioString + "'");
                writeToSessionLog(LOG.Info, "Audio response sent saying '" + audioString + "'");
                let responseFileName = './audio-recordings/server-' + getCurrentDateTime() + '.mp3';
                downloadAudioResponse(url, responseFileName);
            })
            .then(function () {
                if (DEBUG) {
                    console.log('> audio response downloaded successfully');
                }
            })
            .catch(function (err) {
                if (DEBUG) {
                    console.log('> ERROR - Error in sending audio response');
                    writeToServerLog(LOG.Error, "Error in sending audio response");
                }
            });
    }

    // Downloads audio response from url to mp3
    function downloadAudioResponse(url, responseFileName) {
        return new Promise(function (resolve, reject) {
            // Set up http client to call URL
            let parsedURL = urlParse(url);
            let httpClientVar;
            if (parsedURL.protocol === 'https:') {
                httpClientVar = https;
            }
            else {
                httpClientVar = http;
            }
            let options =
                {
                    host: parsedURL.host,
                    path: parsedURL.path
                };

            // GET call at given url
            httpClientVar.get(options, function (response) {
                // check status code
                if (response.statusCode !== 200) {
                    if (DEBUG) {
                        console.log(response.statusCode);
                    }
                    reject(new Error('request to ' + url + ' failed with response code of ' + response.statusCode));

                    writeToServerLog(LOG.Error, 'request to ' + url + ' failed with response code of ' + response.statusCode);
                    return;
                }

                let file = fs.createWriteStream(responseFileName);
                file.on('finish', function () {
                    // Broadcast audio to all connected clients
                    for (var i in io.sockets.connected) {
                        let clientSocket = io.sockets.connected[i];
                        let stream = ss.createStream();
                        ss(clientSocket).emit('audio-stream', stream, { name: responseFileName });
                        fs.createReadStream(responseFileName).pipe(stream);
                    }

                    file.close(resolve);
                });

                response.pipe(file);
            })
                .on('error', function (err) {
                    reject(new Error('Error in GET request'));
                })
                .end();
        });
    }
});

// Serve on assigned port
http.listen(port, function () {
    console.log("Server is listening on port " + port);
    writeToServerLog(LOG.Debug, "Server is now listening");
});

/*********************************************************************************************************
 * 
 * Logging functions
 * 
 ********************************************************************************************************/

// Writes data to a server log (primarily for debugging the server code)
function writeToServerLog(type, logString) {
    let tempDate = new Date();
    let currDate = tempDate.toLocaleString(currLocale);

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
    let currDate = tempDate.toLocaleString(currLocale);

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

/*********************************************************************************************************
 * 
 * Helper functions
 * 
 ********************************************************************************************************/

// Gets file size in requested units
function getFileSize(fileName, unit) {
    let stats = fs.statSync(fileName);
    let tempFileSize = stats.size;

    let fileSize = tempFileSize;
    if (unit === "KB") {
        fileSize = tempFileSize / 1000;
    }
    else if (unit === "MB") {
        fileSize = tempFileSize / 1000000;
    }
    else if (unit === "GB") {
        fileSize = tempFileSize / 1000000000;
    }

    return fileSize;
}

// Gets current date and time for file names
// returns as 'yyyymmdd-hhmmss'
function getCurrentDateTime() {
    let tempDate = new Date();

    let tempYear = tempDate.getFullYear();
    let tempMonth = tempDate.getMonth() + 1;
    let tempDay = tempDate.getDate();
    let tempHour = tempDate.getHours();
    let tempMin = tempDate.getMinutes();
    let tempSec = tempDate.getSeconds();
    return tempYear + formatDateTime(tempMonth) + formatDateTime(tempDay)
        + '-' + formatDateTime(tempHour) + formatDateTime(tempMin) + formatDateTime(tempSec);
}

// Formatting for date
function formatDateTime(tempNumber) {
    let tempString = '';

    if (tempNumber < 10) {
        tempString = '0' + tempNumber;
    }
    else {
        tempString = tempNumber;
    }

    return tempString;
}
