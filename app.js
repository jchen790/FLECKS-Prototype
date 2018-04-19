// const http = require("http");
const path = require("path");
const fs = require("fs");
const port = 3000;
const express = require('express');
var server = express();
const http = require("http").Server(server);

server.get('/', function(req, res) {
    res.sendFile(path.join(__dirname + '/public/index.html'));
});

server.listen(port);

server.get('/script.js', function(req, res) {
    res.sendFile(path.join(__dirname + '/public/script.js'));
});

server.get('/recordrtc/RecordRTC.js', function(req, res) {
    res.sendFile(path.join(__dirname + '/public/recordrtc/RecordRTC.js'));
});

console.log("http://localhost:" + port);

const io = require('socket.io')(http);

io.sockets.on('connection', function(socket) {
    socket.on('message', function(data) {
        console.log('Message - ' + data);
    });

    socket.on('audio', function(data) {
        var fileName = Date.now();

        writeToDisk(data.audio.dataURL, filename + '.wav');
    });
});

function writeToDisk(dataURL, fileName)
{
    var fileExtension = fileName.split('.').pop();
    var filePath = './audio-recordings/' + fileName;
    var vileId = 2;
    var fileBuffer;

    dataURL = dataURL.split(',').pop();
    fileBuffer = new Buffer(dataURL, 'base64');
    fs.writeFileSync(filePath, fileBuffer);

    console.log('file - ' + filePath);
}