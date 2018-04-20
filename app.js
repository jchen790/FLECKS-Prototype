const app = require('express')();
const http = require('http').Server(app);
const path = require("path");
const fs = require("fs");
const io = require('socket.io')(http);

const port = 3000;

app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});

app.get('/script.js', function(req, res){
    res.sendFile(__dirname + '/script.js');
  });

io.sockets.on('connection', function(socket){
  console.log('> a user connected');

  socket.on('new_user', function(username) {
      socket.username = username;
      socket.emit('user_acked', 'You are connected!');
      console.log('>>> ' + socket.username + ' has connected');
  })
});

http.listen(port, function(){
  console.log('listening on http://localhost:' + port);
});