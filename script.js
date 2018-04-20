var socketio = io();

var username = prompt('username?');

var mediaStream = null;

socketio.emit('new_user', username);

socketio.on('connect', function(message) {
    console.log('connected');

    socketio.on('user_acked', function (message) {
        $('#server-message').text(message);
        $('#start-recording').prop("disabled", false);
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
    });

    $('#request').click(function () {
        socketio.emit('request_response', 'request');
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
        });
    });
});





