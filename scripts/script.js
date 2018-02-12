var client = new BinaryClient('ws://localhost:9001')

client.on('open', () => {
    window.Stream = client.createStream();

    // get access to (browser) mic
    if(!navigator.getUserMedia)
    {
        alert('Error in requesting mic access');
    }
    else
    {
        var session = { audio: true };
        navigator.getUserMedia(session, audioRec, (err) => {
            alert('Error in capturing audio');
        });
    }
});

var isRecording = false;

function startAudioRec() {
    // start recording audio
    recording = true;
}

function stopAudioRec() {
    // stop recording audio
    recording = false;
    Window.Stream.end();
}

function audioRec(e) {
    // send audio through processing nodes
    let audioContext = window.AudioContext;
    let context = new audioContext();
    let audioInput = context.createMediaStreamSource(stream);
    let buffersize = 2048;

    let recorder = context.createScriptProcessor(BufferSize, 1, 1);

    recorder.onaudioprocess = (e) => {
        if(!recording)
        {
            return;
        }
        else
        {
            let left = e.inputBuffer.getChannelData(0);
            window.Stream.write(floatToInt(left));
        }
    }

    audioInput.connect(recorder);
    recorder.connect(context.destination);
}

function floatToInt(x) {
    let length = x.length;
    let buffer = new Int16Array(length);

    while(length--)
    {
        buffer[length] = buffer[length] * 0xFFFF;
    }

    return buffer.buffer;
}