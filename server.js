var express = require('express');
var app = express();
var fs = require('fs');
var path = require('path');

app.get('/edit/*', function(req, res) {
		
});

app.get('/view/*', function(req, res) {;
	
});

app.get('/read*', function(req, res) {
	
});

app.post('/write*', function(req, res) {

});

app.get('*', function(req, res, next) {
	res.
	returnFile(filePath, res)
});

var server = app.listen(8081, function() {
	console.log("Listening on port %d", server.address().port);
});

function returnFile(filePath, res) {
	fs.readFile(filePath, "binary", function(err, file) {
		if (err) {
			res.writeHead(500, {"Content-Type": "text/plain"});
			res.write(err + "\n");
			res.end();
			return;
		}

		var headers = {}

		// set content type
		type = mime.lookup(filePath);
		if (!res.getHeader('content-type')) {
			var charset = mime.charsets.lookup(type);
			headers['Content-Type'] = type + (charset ? '; charset=' + charset : '');
		}

		res.writeHead(200, headers);
		res.write(file, "binary");
		res.end();
	});
}