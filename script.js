var socketio = io();

var username = prompt('username?');

socketio.emit('new_user', username);

socketio.on('user_acked', function (message) {
    $('#server-message').text(message);
})