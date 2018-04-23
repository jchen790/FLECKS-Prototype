// Logging enums and debugging flags
var LOG = {
    Error: 0,
    Info: 1,
    Debug: 2
};
var DEBUG = true;

// Checks for number of connected users
var connectedUsers = 0;

const app = require('express')();
const http = require('http').Server(app);
const path = require("path");
const fs = require("fs");
const io = require('socket.io')(http);
const ss = require('socket.io-stream');

// Choose which local port
const port = 8080;

var googleTTS = require('google-tts-api');

var x = "yasss queen";
var testURL = "";

googleTTS('Hello World, I just wanna say ' + x, 'en', 1)   // speed normal = 1 (default), slow = 0.24
.then(function (url) {
    testURL = url;
  console.log(url); // https://translate.google.com/translate_tts?...
})
.catch(function (err) {
  console.error(err.stack);
});

// Serve html file
app.get('/', function (req, res) {
    res.sendFile(__dirname + '/index.html');
});

// Serve custom js
app.get('/script.js', function (req, res) {
    res.sendFile(__dirname + '/js/script.js');
});

// Serve recording js
app.get('/recordrtc/RecordRTC.js', function (req, res) {
    res.sendFile(__dirname + '/js/recordrtc/RecordRTC.js');
});

// Serve streaming js
app.get('/socket.io-stream.js', function (req, res) {
    res.sendFile(__dirname + '/js/socket.io-stream.js');
});

// Serve stylesheet
app.get('/styles.css', function (req, res) {
    res.sendFile(__dirname + '/styles.css');
});

// Serve image
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
        socket.emit('test', testURL);

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

        let stream = ss.createStream();
        let fileName = __dirname + '/server-audio0.wav';

        writeToServerLog(LOG.Debug, "Server is returning " + fileName);

        ss(socket).emit('audio-stream', stream, { name: fileName });
        fs.createReadStream(fileName).pipe(stream);

        // broadcast audio to all other clients
        for (var i in io.sockets.connected) {
            if (io.sockets.connected[i].id != socket.id) {
                let clientSocket = io.sockets.connected[i];
                let stream1 = ss.createStream();
                ss(clientSocket).emit('audio-stream', stream1, { name: fileName });
                fs.createReadStream(fileName).pipe(stream1);
            }
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

    // Send audio response to all clients every 2 min
    var audioResponseInterval = setInterval(() => {
        // don't start timer if not signed in yet
        if (!socket.username) {
            return;
        }

        // broadcast audio to all other clients
        for (var i in io.sockets.connected) {
            if (io.sockets.connected[i].id != socket.id) {
                let clientSocket = io.sockets.connected[i];
                let stream = ss.createStream();
                let fileName = __dirname + '/server-audio0.wav';
                ss(clientSocket).emit('audio-stream', stream, { name: fileName });
                fs.createReadStream(fileName).pipe(stream);
            }
        }

        writeToServerLog(LOG.Info, "Server audio response sent to clients");
        writeToSessionLog(LOG.Info, "Server audio response sent to clients");
    }, 120000);

    // Write to log file
    socket.on('log', function (message) {
        sessionLogFileWriteStream.write(message);
    });

    socket.on('disconnect', function (message) {
        writeToServerLog(LOG.Info, socket.username + " has disconnected");
        writeToSessionLog(LOG.Info, socket.username + " has disconnected");
        connectedUsers--;
        resetSessionLog(connectedUsers);
    });
});

http.listen(port, function () {
    writeToServerLog(LOG.Debug, "Server is now listening");
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
}

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