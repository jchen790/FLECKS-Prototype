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
    res.sendFile(__dirname + '/script.js');
});

// Serve recording js
app.get('/recordrtc/RecordRTC.js', function (req, res) {
    res.sendFile(__dirname + '/recordrtc/RecordRTC.js');
});

// Serve streaming js
app.get('/socket.io-stream.js', function (req, res) {
    res.sendFile(__dirname + '/socket.io-stream.js');
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

    // Send audio response
    socket.on('request_response', function (data) {
        console.log('> audio response requested');

        let stream = ss.createStream();
        let fileName = __dirname + '/server-audio0.wav';

        console.log(fileName);

        ss(socket).emit('audio-stream', stream, {name: fileName});
        fs.createReadStream(fileName).pipe(stream);

        console.log('after socketio-stream');
    });
});

http.listen(port, function () {
    console.log('listening on http://localhost:' + port);
});

function writeAudioFile(dataURL, fileName)
{
    let filePath = './audio-recordings/' + fileName;
    let fileBuffer;
    dataURL = dataURL.split(',').pop();
    fileBuffer = new Buffer(dataURL, 'base64');
    fs.writeFileSync(filePath, fileBuffer);

    console.log('> audio file saved as ' + filePath);
}