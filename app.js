const express = require('express');
const app = express();
const port = 3000;

// using a web page and saving as a file locally for now
// TODO - switch to an API call and store data in a database
const fs = require('fs');
const pug = require('pug');
app.set('view engine', 'pug');


app.get('/', (request, response) => {
    response.render('index');
});

app.listen(3000, () => console.log('Example app listening on port 3000!'));