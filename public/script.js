var client = new BinaryClient('ws://localhost:9001');

client.on('open', function () {
    window.Stream = client.createStream();
    // window.Stream.write('0');
    let logStream = client.createStream('logStream');
    // logStream.write('1');

    // get access to (browser) mic
    if (!navigator.getUserMedia)
        navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia ||
            navigator.mozGetUserMedia || navigator.msGetUserMedia;

    if (navigator.getUserMedia) {
        navigator.getUserMedia({ audio: true }, audioRec, function (err) {
            alert('Error capturing audio.');
        });
    } else alert('getUserMedia not supported in this browser.');

    // tells us when to start processing the audio 
    var isRecording = false;

    // functions for the interface buttons
    window.startAudioRec = function () {
        isRecording = true;
        console.log('"Start recording" button pressed');
        logStream.write('"Start recording" button pressed \n');
    }

    window.stopAudioRec = function () {
        isRecording = false;
        console.log('"Stop recording" button pressed');
        logStream.write('"Stop recording" button pressed \n');
        window.Stream.end();
    }

    // sends the audio through processing nodes 
    function audioRec(e) {
        audioContext = window.AudioContext || window.webkitAudioContext;
        context = new audioContext();

        // the sample rate is in context.sampleRate
        audioInput = context.createMediaStreamSource(e);

        var bufferSize = 2048;
        recorder = context.createScriptProcessor(bufferSize, 1, 1);

        recorder.onaudioprocess = function (e) {
            if (!isRecording) {
                return;
            }
            console.log('Is recording');
            var left = e.inputBuffer.getChannelData(0);
            window.Stream.write(float32ToInt16(left));
        }

        audioInput.connect(recorder);
        recorder.connect(context.destination);
    }

    // converts the buffer to the right format
    function float32ToInt16(buffer) {
        var l = buffer.length;
        var buf = new Int16Array(l)

        while (l--) {
            buf[l] = buffer[l] * 0xFFFF;    //convert to 16 bit
        }
        return buf.buffer
    }

    window.clickedStart = function () {
        console.log('"Start program" button clicked');
        logStream.write('"Start program" button pressed \n');
    }

    window.clickedDebug = function () {
        console.log('"Debug program" button clicked');
        logStream.write('"Debug program" button pressed \n');
    }

    window.clickedAdd1 = function () {
        console.log('"Add block 1" button clicked');
        logStream.write('"Add block 1" button clicked \n');
    }

    window.clickedAdd2 = function () {
        console.log('"Add block 2" button clicked');
        logStream.write('"Add block 2" button clicked \n');
    }

    window.clickedAdd3 = function () {
        console.log('"Add block 3" button clicked');
        logStream.write('"Add block 3" button clicked \n');
    }
});

