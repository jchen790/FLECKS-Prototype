// Logging enums
var LOG = {
    Error: 0,
    Info: 1,
    Debug: 2
};

var socketio = io();
var mediaStream = null;
var isRecording = false;

// Get username - will be used for logs and file names
var username = "";
$('#connect').click(function() {
    let tmp = $('#username').val();
    tmp = tmp.replace(/\s/g,'');
    if(tmp == "")
    {
        $('#username-error').text("Please enter a valid name");
    }
    else
    {
        username = tmp;
        socketio.emit('new_user', username);
        $('#signin').hide();
        $('#main').show();
    }
});

socketio.on('connect', function(message) {
    console.log('Connected');

    socketio.on('user_acked', function (message) {
        $('#server-message').text(message);
        $('#recording').prop("disabled", false);

        socketio.emit('log', writeToLog(LOG.Info, "Client " + username + " is ready to record"));
    });

    var recordAudio;

    $('#recording').click(function () {
        isRecording = !isRecording;
        if(isRecording)
        {
            navigator.getUserMedia({
                audio: true
            }, function (stream) {
                mediaStream = stream;

                recordAudio = RecordRTC(stream, {
                    type: 'audio', 
                    recorderType: StereoAudioRecorder,
                    onAudioProcessStarted: function() {}
                });

                recordAudio.startRecording();

                $('#stop-recording').prop("disabled", false);
            }, function(error) {
                alert('Recording error - ' + JSON.stringify(error));
                socketio.emit('log', writeToLog(LOG.Error, "Cannot use getUserMedia()"));
            });

            $('#recording-icon').text('stop');
            socketio.emit('log', writeToLog(LOG.Info, "Client " + username + " began recording"));
        }
        else
        {
            recordAudio.stopRecording(function() {
                recordAudio.getDataURL(function(audioDataURL) {
                    var files = {
                        audio: {
                            type: recordAudio.getBlob().type || 'audio/wav',
                            dataURL: audioDataURL
                        }
                    };
                    
                    $('#recording-icon').text('mic');
                    socketio.emit('audio', files);
                    if (mediaStream)
                    {
                        mediaStream.stop();
                    }
                });
            });
    
            socketio.emit('log', writeToLog(LOG.Info, "Client " + username + " stopped recording"));
            socketio.emit('end_session', 0);
        }
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



