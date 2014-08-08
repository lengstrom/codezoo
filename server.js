var express = require('express');
var mime = require('mime');
var url = require('url');
var bodyParser = require('body-parser')
var fs = require('fs');
var path = require('path');

var app = express();

app.get('/edit/*', function(req, res) {
	var filePath = returnFilePath(req, '/edit/', '/edit/'.length)
	if (fs.statSync(filePath).isDirectory()) {
		// filePath = path.join(filePath,'/index.html');
		var uri = url.parse(req.url).pathname;
		res.redirect(path.join(__dirname, '/view/', uri.substr('/edit/').length));
	} else {
		returnFile(path.join(__dirname,'/static/edit.html'), res);
	}
});

app.get('/view/*', function(req, res) {
	var filePath = returnFilePath(req, '/storage/', '/view/'.length)
	if (!fs.existsSync(filePath)) {
		filePath = path.join(__dirname, '/static/404_newfile.html')
	}

	if (fs.statSync(filePath).isDirectory()) {
		returnFile(path.join(__dirname, '/static/dir.html'), res);
	}

	returnFile(filePath, res);
});

app.use(bodyParser.json()); // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({
	extended:true
})); // to support URL-encoded bodies

app.post('/write*', function(req, res) {
	var filePath = req.body.path;
	var content = req.body.content;
	console.log(req.body);
});

app.get('*', function(req, res, next) {
	returnFile(returnFilePath(req, '/static/', 0), res);
});

var server = app.listen(8081, function() {
	console.log("Listening on port %d", server.address().port);
});

function returnFilePath(req, parentDir, substr_index) {
	var uri = url.parse(req.url).pathname;
	if (substr_index) {
		uri = uri.substr(substr_index);
	}

	return path.join(__dirname, parentDir, uri);
}

function returnFile(filePath, res, dir) {
	var statusCode = 200;
	if (dir) {
		if (fs.statSync(filePath).isDirectory()) {
			filePath = path.join(filePath,'/index.html');
		}
	}

	if (!fs.existsSync(filePath)) {
		filePath = '/static/404.html';
		statusCode = 404;
	}

	fs.readFile(filePath, "binary", function(err, file) {
		if (err) {
			statusCode = 500;
			filePath = '/static/error.html';
		}

		var headers = {}
		// set content type
		type = mime.lookup(filePath);
		if (!res.getHeader('content-type')) {
			var charset = mime.charsets.lookup(type);
			headers['Content-Type'] = type + (charset ? '; charset=' + charset : '');
		}

		res.writeHead(statusCode, headers);

		res.write(file, "binary");
		res.end();
	});
}

function getURLParts(requestURL) {
	var url_parts = url.parse(requestURL, true);
	var query = url_parts.query;
}