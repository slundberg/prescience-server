var express = require('express');
var https = require('https');
var http = require('http');
var url = require('url');
var fs = require('fs');
var basicAuth = require('basic-auth-connect');
var proxy = require('express-http-proxy');
var bcrypt = require('bcrypt');
var bodyParser = require('body-parser');
var passwords = require('./client-passwords.json');

// pre-compute all the hashes
var hashes = {};
for (var k in passwords) {
    hashes[k] = bcrypt.hashSync(passwords[k], 12);
}

// Create a service
var app = express();
app.use(express.static('../../prescience-interface'));

// proxy requests we authenticate to elasticsearch
var adminPassword = fs.readFileSync('../elasticsearch.admin.password').toString().trim();
var adminAuth = (new Buffer('admin:'+adminPassword, 'ascii')).toString('base64');
app.use('/db', proxy('localhost:9200', {
    forwardPath: function(req, res) {
        return require('url').parse(req.url).path;
    },
    filter: function(req, res) {
        console.log("filtering", req.method)
        var user = req.get("Prescience-User");
        var token = req.get("Prescience-Token");
        return hashes.hasOwnProperty(user) && hashes[user] === token;
    },
    decorateRequest: function(req) {
        console.log(req.method);
        req.headers['Authorization'] = "Basic "+adminAuth;
        return req;
    }
}));

app.use(bodyParser.json());
app.post('/auth', function(req, res) {
    if (passwords.hasOwnProperty(req.body.user) && passwords[req.body.user] === req.body.password) {
        res.send(hashes[req.body.user]);
    } else res.status(401).send("auth failed")
});

// Create an HTTPS service
https.createServer({
    key: fs.readFileSync('private/ca_decrypted.key'),
    cert: fs.readFileSync('private/prescience.cs.washington.edu.crt'),
    ca: fs.readFileSync('private/ca.crt')
}, app).listen(4443);
