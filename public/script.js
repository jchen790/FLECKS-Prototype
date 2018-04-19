var socketio = io();

var mediaStream = null;

var startRecording = document.getElementById('start-recording');
var stopRecording = document.getElementById('stop-recording');

socketio.on('connect', function() {
    startRecording.disabled = false;
});

var recordAudio;

startRecording.onclick = function() {
    startRecording.disabled = true;
    navigator.getUserMedia({
        audio: true
    }, function(stream) {
        mediaStream = stream;

        recordAudio = RecordRTC(stream, {
            type: 'audio',
            recorderType: StereoAudioRecorder,
            onAudioProcessStarted: function() {

            }
        });

        recordAudio.startRecording();

        stopRecording.disabled = false;
    }, function(error) {
        alert('recording error - ' + JSON.stringify(error));
    });
};

stopRecording.onclick = function() {
    startRecording.disabled = false;
    stopRecording.disabled = true;

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
};