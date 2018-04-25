// Logging enums
var LOG = {
    Error: 0,
    Info: 1,
    Debug: 2
};

var socketio = io();
var mediaStream = null;
var isRecording = false;
var isConnected = false;

// Get username - will be used for logs and file names
var username = "";
$('#connect').click(function () {
    let tmp = $('#username').val();
    tmp = tmp.replace(/\s/g, '');
    if (tmp == "") {
        $('#username-error').text("Please enter a valid name");
    }
    else {
        username = tmp;
        socketio.emit('new_user', username);
        $('#signin').hide();
        $('#main').show();
    }
});

// Connected socket
socketio.on('connect', function (message) {
    console.log('Connected');

    // User has been acknowledged
    socketio.on('user_acked', function (message) {
        $('#server-message').text(message);
        $('#recording').prop("disabled", false);
        isConnected = true;

        socketio.emit('log', writeToLog(LOG.Info, "Client " + username + " is ready to record"));
    });

    var recordAudio;

    // Toggle recording mode - save audio when recording, stream all saved audio when stopped
    $('#recording').click(function () {
        isRecording = !isRecording;
        if (isRecording) {
            $('#audio-request').prop('disabled', true);
            navigator.getUserMedia({
                audio: true
            }, function (stream) {
                mediaStream = stream;

                recordAudio = RecordRTC(stream, {
                    type: 'audio',
                    recorderType: StereoAudioRecorder,
                    onAudioProcessStarted: function () { }
                });

                recordAudio.startRecording();

                $('#stop-recording').prop("disabled", false);
            }, function (error) {
                alert('Recording error - ' + JSON.stringify(error));
                socketio.emit('log', writeToLog(LOG.Error, "Cannot use getUserMedia()"));
            });

            $('#recording-icon').text('stop');
            $('#recording-text').text('Recording in progress...');
            socketio.emit('log', writeToLog(LOG.Info, "Client " + username + " began recording"));
        }
        else {
            $('#audio-request').prop('disabled', false);
            recordAudio.stopRecording(function () {
                recordAudio.getDataURL(function (audioDataURL) {
                    var files = {
                        audio: {
                            type: recordAudio.getBlob().type || 'audio/wav',
                            dataURL: audioDataURL
                        }
                    };

                    $('#recording-icon').text('mic');
                    $('#recording-text').text('');
                    socketio.emit('audio', files);
                    if (mediaStream) {
                        mediaStream.stop();
                    }
                });
            });

            socketio.emit('log', writeToLog(LOG.Info, "Client " + username + " stopped recording"));
        }
    });

    // Receive streamed audio from server
    ss(socketio).on('audio-stream', function (stream, data) {
        if(isConnected)
        {
            console.log('Received server audio response');

            parts = [];
            stream.on('data', function (chunk) {
                parts.push(chunk);
            });

            stream.on('end', function () {
                let audioResponse = document.getElementById('server-response');
                audioResponse.src = (window.URL || window.webkitURL).createObjectURL(new Blob(parts));
                audioResponse.play();
                socketio.emit('log', writeToLog(LOG.Info, "Client " + username + " received an audio response from server"));
            });
        }
    });

    // Manually request final audio file
    $('#audio-request').click(function () {
        socketio.emit('request_final', 'request');
        socketio.emit('log', writeToLog(LOG.Info, "Client " + username + " requested their final audio file"));
    });

    // Receive final audio file from server
    ss(socketio).on('final-audio-stream', function (stream, data) {
        console.log('Received recorded audio');

        parts = [];
        stream.on('data', function (chunk) {
            parts.push(chunk);
        });

        stream.on('end', function () {
            let audioResponse = document.getElementById('final-audio');
            audioResponse.src = (window.URL || window.webkitURL).createObjectURL(new Blob(parts));
            audioResponse.play();
            socketio.emit('log', writeToLog(LOG.Info, "Client " + username + " received an audio response from server"));
        });
    });
});

// Format strings for logs
function writeToLog(type, logString) {
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

    return currDate + " --- " + typeString + " --- " + logString + ' \n';
}



