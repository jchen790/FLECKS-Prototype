# FLECKS Prototype

A simple prototype for the FLECKS project.

## Background

This prototype was built for a UF CISE Senior Design Project. This is a prototype of the audio data collection portion of the FLECKS Project. As students interact with the programming environment (simulated by the client), the environment will record their conversation and send it back to the server for further analysis. The server can then send audio feedback so that the students can learn and grow.

## Try It Out!

The project is currently being hosted by AWS at <https://ec2-18-219-187-222.us-east-2.compute.amazonaws.com:8080/>

Clone this repository to your machine. Once cloned, you can start the project by using
```
node app.js
```
You can then connect to the server at <https://localhost:8080>

## Implementation

The project was created using Node.js and Express. The following packages were used to help with the audio and networking:
- [Socket.io](https://github.com/socketio/socket.io): managed connections with multiple clients
- [Socket.io-stream](https://github.com/nkzawa/socket.io-stream): streamed audio across the sockets from client to server and vice versa
- [RecordRTC](https://github.com/muaz-khan/RecordRTC): captured audio from mic and prepared it for streaming
- [Google TTS API](https://github.com/zlargon/google-tts): created custom audio responses

Bootstrap and jQuery were used to keep the front-end 'clean' and responsive.
