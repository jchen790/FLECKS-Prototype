// Logging enums
var LOG = {
    Error: 0,
    Info: 1,
    Debug: 2
};

const app = require('express')();
const http = require('http').Server(app);
const path = require("path");
const fs = require("fs");
const io = require('socket.io')(http);
const ss = require('socket.io-stream');

// Choose which local port
const port = 3000;

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

// Set up write streams for logs
let sessionLogFileName = './logs/session-' + Date.now() + '.log';
let sessionLogFileWriteStream = fs.createWriteStream(sessionLogFileName);
let serverLogFileName = './logs/debugging/server-' + Date.now() + '.log';
let serverLogFileWriteStream = fs.createWriteStream(serverLogFileName);

// Use socket.io and socket.io-stream libraries to stream and emit data
io.sockets.on('connection', function (socket) {
    console.log('> a user connected');
    writeToServerLog(LOG.Debug, "A user connected");

    // New user connected - log user
    socket.on('new_user', function (username) {
        socket.username = username;
        socket.emit('user_acked', 'You are connected!');
        console.log('>>> ' + socket.username + ' has connected');
        writeToServerLog(LOG.Info, socket.username + " is now connected");
        writeToSessionLog(LOG.Info, socket.username + " is now connected");
    });

    // Collect audio stream
    socket.on('audio', function (data) {
        let fileName = socket.username + '-' + Date.now();

        writeAudioFile(data.audio.dataURL, fileName + '.wav');
    });

    // Send audio response
    socket.on('request_response', function (data) {
        console.log('> audio response requested');
        writeToServerLog(LOG.Info, socket.username + " requested an audio response from server");

        let stream = ss.createStream();
        let fileName = __dirname + '/server-audio0.wav';

        writeToServerLog(LOG.Debug, "Server is returning " + fileName);

        ss(socket).emit('audio-stream', stream, {name: fileName});
        fs.createReadStream(fileName).pipe(stream);

        writeToServerLog(LOG.Debug, "Server has written to the audio to stream");
    });

    // Write to log file
    socket.on('log', function (message) {
        sessionLogFileWriteStream.write(message);
    });

    // convo ends

    socket.on('disconnect', function (message) {
        writeToServerLog(LOG.Info, socket.username + " has disconnected");
        writeToSessionLog(LOG.Info, socket.username + " has disconnected");
    });
});

http.listen(port, function () {
    writeToServerLog(LOG.Debug, "Server is now listening");
});

function writeAudioFile(dataURL, fileName)
{
    let filePath = './audio-recordings/' + fileName;
    let fileBuffer;
    dataURL = dataURL.split(',').pop();
    fileBuffer = new Buffer(dataURL, 'base64');
    fs.writeFileSync(filePath, fileBuffer);

    console.log('> audio file saved as ' + filePath);
    writeToServerLog(LOG.Info, "Audio file is saved at " + filePath);
    writeToSessionLog(LOG.Info, "Audio file is saved at " + filePath);
}

function writeToServerLog(type, logString)
{
    let tempDate = new Date();
    // TODO - update to school's locale
    let currDate = tempDate.toLocaleString("en-US");

    let typeString = "";
    if (type === LOG.Error)
    {
        typeString = "ERROR";
    }
    else if (type === LOG.Info)
    {
        typeString = "INFO";
    }
    else if (type === LOG.Debug)
    {
        typeString = "DEBUG";
    }
    else
    {
        typeString = "LOG";
    }

    serverLogFileWriteStream.write(currDate + " --- " + typeString + " --- " + logString + ' \n');
}

function writeToSessionLog(type, logString)
{
    let tempDate = new Date();
    // TODO - update to school's locale
    let currDate = tempDate.toLocaleString("en-US");

    let typeString = "";
    if (type === LOG.Error)
    {
        typeString = "ERROR";
    }
    else if (type === LOG.Info)
    {
        typeString = "INFO";
    }
    else if (type === LOG.Debug)
    {
        typeString = "DEBUG";
    }
    else
    {
        typeString = "LOG";
    }

    sessionLogFileWriteStream.write(currDate + " --- " + typeString + " --- " + logString + ' \n');
}