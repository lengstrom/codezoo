var express = require('express');
var app = express();



app.get('/edit/*', function(req, res) {
	
});

app.get('/view/*', function(req, res) {
	
});

app.get('/read*', function(req, res) {
	
});

app.post('/write*', function(req, res) {

});

app.get('*', function(req, res) {

});

var server = app.listen(8081, function() {
	console.log("Listening on port %d", server.address().port);
});