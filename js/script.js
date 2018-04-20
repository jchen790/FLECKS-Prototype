// Logging enums
var LOG = {
    Error: 0,
    Info: 1,
    Debug: 2
};

var socketio = io();

var username = prompt('username?');

var mediaStream = null;

socketio.emit('new_user', username);

socketio.on('connect', function(message) {
    console.log('Connected');

    socketio.on('user_acked', function (message) {
        $('#server-message').text(message);
        $('#start-recording').prop("disabled", false);

        socketio.emit('log', writeToLog(LOG.Info, "Client " + username + " is ready to record"));
    });

    var recordAudio;

    $('#start-recording').click(function () {
        $('#start-recording').prop("disabled", true);
        navigator.getUserMedia({
            audio: true
        }, function (stream) {
            mediaStream = stream;

            recordAudio = RecordRTC(stream, {
                type: 'audio', 
                recorderType: StereoAudioRecorder,
                onAudioProcessStarted: function() {

                }
            });

            recordAudio.startRecording();

            $('#stop-recording').prop("disabled", false);
        }, function(error) {
            alert('Recording error - ' + JSON.stringify(error));
        });

        socketio.emit('log', writeToLog(LOG.Info, "Client " + username + " began recording"));
    });

    $('#stop-recording').click(function() {
        $('#start-recording').prop("disabled", false);
        $('#stop-recording').prop("disabled", true);

        recordAudio.stopRecording(function() {
            recordAudio.getDataURL(function(audioDataURL) {
                var files = {
                    audio: {
                        type: recordAudio.getBlob().type || 'audio/wav',
                        dataURL: audioDataURL
                    }
                };

                socketio.emit('audio', files);
                if (mediaStream)
                {
                    mediaStream.stop();
                }
            });
        });

        socketio.emit('log', writeToLog(LOG.Info, "Client " + username + " stopped recording"));
        socketio.emit('end_session', 0);
    });

    $('#request').click(function () {
        socketio.emit('request_response', 'request');
        socketio.emit('log', writeToLog(LOG.Info, "Client " + username + " requested an audio response from server"));
    });

    ss(socketio).on('audio-stream', function(stream, data) {
        console.log('received data');

        parts = [];
        stream.on('data', function(chunk) {
            parts.push(chunk);
        });

        stream.on('end', function() {
            let audioResponse = document.getElementById('server-response');
            audioResponse.src = (window.URL || window.webkitURL).createObjectURL(new Blob(parts));
            audioResponse.play();
            socketio.emit('log', writeToLog(LOG.Info, "Client " + username + " received an audio response from server"));
        });
    });
});

function writeToLog(type, logString)
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

    return currDate + " --- " + typeString + " --- " + logString + ' \n';
}



