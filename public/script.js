var client = new BinaryClient('ws://localhost:9001');
var ERROR = 0;
var INFO = 1;
var DEBUG = 2;

client.on('open', function () {
    // create streams for audio and logs 
    window.Stream = client.createStream();
    let logStream = client.createStream('logStream');
    writeToLog(INFO, 'Connected to client');
    writeToLog(INFO, 'Audio and Log streams started');

    // get access to (browser) mic
    if (!navigator.getUserMedia)
        navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia ||
            navigator.mozGetUserMedia || navigator.msGetUserMedia;

    if (navigator.getUserMedia) {
        navigator.getUserMedia({ audio: true }, audioRec, function (err) {
            alert('Error capturing audio.');
            writeToLog(ERROR, "Could not capture audio");
        });
    } else {
        alert('getUserMedia not supported in this browser.');
        writeToLog(ERROR, 'getUserMedia not supported in this browser');
    }

    // tells us when to start processing the audio 
    var isRecording = false;

    // functions for the interface buttons
    window.startAudioRec = function () {
        isRecording = true;
        console.log('"Start recording" button pressed');
        writeToLog(INFO, 'Start recording audio');
    }

    window.stopAudioRec = function () {
        isRecording = false;
        console.log('"Stop recording" button pressed');
        writeToLog(INFO, 'Stop recording audio');
        window.Stream.end();
        writeToLog(INFO, 'Audio stream ended');
        location.reload();
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

    /*
        0 - Error
        1 - Info
        2 - Debug
    */
    function writeToLog(type, logString)
    {
        let tempDate = new Date();
        let currDate = tempDate.toLocaleString("en-US");

        let typeString = "";
        if (type === 0)
        {
            typeString = "ERROR";
        }
        else if (type === 1)
        {
            typeString = "INFO";
        }
        else if (type === 2)
        {
            typeString = "DEBUG";
        }
        else
        {
            typeString = "LOG";
        }

        logStream.write(currDate + " --- " + typeString + " --- " + logString + ' \n');
    }
});
