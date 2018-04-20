const app = require('express')();
const http = require('http').Server(app);
const path = require("path");
const fs = require("fs");
const io = require('socket.io')(http);

// Choose which local port
const port = 3000;

// Serve html file
app.get('/', function (req, res) {
    res.sendFile(__dirname + '/index.html');
});

// Serve custom js
app.get('/script.js', function (req, res) {
    res.sendFile(__dirname + '/script.js');
});

// Serve recording js
app.get('/recordrtc/RecordRTC.js', function (req, res) {
    res.sendFile(__dirname + '/recordrtc/RecordRTC.js');
});

io.sockets.on('connection', function (socket) {
    console.log('> a user connected');

    // New user connected - log user
    socket.on('new_user', function (username) {
        socket.username = username;
        socket.emit('user_acked', 'You are connected!');
        console.log('>>> ' + socket.username + ' has connected');
    });

    // Collect audio stream
    socket.on('audio', function (data) {
        let fileName = socket.username + '-' + Date.now();

        writeAudioFile(data.audio.dataURL, fileName + '.wav');
    });
});

http.listen(port, function () {
    console.log('listening on http://localhost:' + port);
});

function writeAudioFile(dataURL, fileName)
{
    let filePath = './audio-recordings/' + fileName;
    let fileID = 2;
    let fileBuffer;
    dataURL = dataURL.split(',').pop();
    fileBuffer = new Buffer(dataURL, 'base64');
    fs.writeFileSync(filePath, fileBuffer);

    console.log('> audio file saved as ' + filePath);
}