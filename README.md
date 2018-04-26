# FLECKS Prototype 

A simple prototype for audio data collection for the FLECKS project.

## Background

This project was built for a UF CISE Senior Design Project and is a prototype of the audio data collection portion of the FLECKS Project. As students interact with the programming environment (simulated by the client), the environment will record their conversation and send it back to the server for further analysis. The server can then send audio feedback so that the students can learn and grow.

## Try It Out!

### Access from Remote Server

The project is currently being hosted by AWS at <https://ec2-18-219-187-222.us-east-2.compute.amazonaws.com:8080/>

### Running It Locally

Clone this repository to your machine. Once cloned, make sure you have all the required packages by running
```
npm install es6-promise express http https path fs socket.io-stream url google-tts-api socket.io
```
You can start the project by using
```
node app.js
```
You can then connect to the server at <https://localhost:8080>

### An Important Note

Although this project uses an HTTPS connection, it currently uses a self-signed certificate, so browsers still think it is a dangerous connection. You can ignore the warning and proceed to the page to access the client.

## Implementation

The project was created using Node.js and Express. The following packages were used to help with the audio and networking:
- [Socket.io](https://github.com/socketio/socket.io): managed connections with multiple clients
- [Socket.io-stream](https://github.com/nkzawa/socket.io-stream): streamed audio across the sockets from client to server and vice versa
- [RecordRTC](https://github.com/muaz-khan/RecordRTC): captured audio from mic and prepared it for streaming
- [Google TTS API](https://github.com/zlargon/google-tts): created custom audio responses

Bootstrap and jQuery were used to keep the front-end clean and responsive.
