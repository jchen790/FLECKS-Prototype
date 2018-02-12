var client = new BinaryClient('ws://localhost:9001')

client.on('open', () => {
    window.Stream = client.createStream();

    // get access to (browser) mic
    if (!navigator.getUserMedia) {
        navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia ||
            navigator.mozGetUserMedia || navigator.msGetUserMedia;
    }

    if (navigator.getUserMedia) {
        var session = { 
            audio: true,
            video: false
         };
        navigator.getUserMedia(session, audioRec, (err) => {
            alert('Error in capturing audio');
        });
    }
    else
    {
        alert('Error in requesting mic access');
    }
});

var isRecording = false;

function startAudioRec() {
    // start recording audio
    // window.Stream = client.createStream();
    isRecording = true;
    console.log("Start recording.");
}

function stopAudioRec() {
    // stop recording audio
    isRecording = false;
    console.log("Stop recording.");
    window.Stream.end();
}

function audioRec(stream) {
    // send audio through processing nodes
    console.log("Sending audio through processing nodes!");
    let audioContext = window.AudioContext || window.webkitAudioContext;
    let context = new audioContext();
    let audioInput = context.createMediaStreamSource(stream);
    let bufferSize = 2048;

    let recorder = context.createScriptProcessor(bufferSize, 1, 1);

    recorder.onaudioprocess = (e) => {
        if (!isRecording) {
            console.log("--->Not recording");
            return;
        }

        console.log("--->Is recording");
        let left = e.inputBuffer.getChannelData(0);
        window.Stream.write(floatToInt(left));
    }

    audioInput.connect(recorder);
    recorder.connect(context.destination);
}

function floatToInt(x) {
    let length = x.length;
    let b = new Int16Array(length);

    while (length--) {
        b[length] = b[length] * 0xFFFF;
    }

    return b.buffer;
}
