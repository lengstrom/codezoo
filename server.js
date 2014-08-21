var express = require('express');
var mkpath = require('mkpath');
var mime = require('mime');
var url = require('url');
var bodyParser = require('body-parser')
var fs = require('fs');
var path = require('path');

var app = express();

app.get('/edit/*', function(req, res) {
	var filePath = returnFilePath(req, '/edit/', '/edit/'.length)
	if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
		var uri = url.parse(req.url).pathname;
		res.redirect(path.join(__dirname, '/view/', uri.substr('/edit/').length));
	} else {
		returnFile(path.join(__dirname,'/static/edit.html'), res, 200);
	}
});

app.get('/view/*', function(req, res) {
	var filePath = returnFilePath(req, '/storage/', '/view/'.length)
	if (!fs.existsSync(filePath)) {
		filePath = path.join(__dirname, '/static/404_newfile.html')
	} else {
		if (isFileInDirectory(filePath,path.join(__dirname, '/storage'))) {
			if (fs.statSync(filePath).isDirectory()) {
				returnFile(path.join(__dirname, '/static/dir.html'), res, 200, filePath);
			} else {
				returnFile(filePath, res, 200);
			}
		} else {
			handleError(res, 550, true);
		}
	}
});

app.get('/listDir*', function(req, res) {
	var parts = getURLParts(req);
	var filePath = returnFilePath(parts.dir, '/storage/');
	var headers = {
		'Content-Type':'application/json'
	};

	if (!isFileInDirectory(filePath, storageDir)) {
		handleError(res, 550, true);
	} else {
		fs.readdir(filePath, function(err, files) {
			if (err) {
				handleError(res, 500, true);
				return;
			}

			res.writeHead(200, headers);
			res.end(JSON.stringify(files));
		});
	}
});

app.use(bodyParser.json()); // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({ // to support URL-encoded bodies
	extended:true
}));

app.post('/write*', function(req, res) {
	var filePath = req.body.path;
	var content = req.body.content;
	var headers = {
		'Content-Type':'text/plain'
	};

	if (filePath.substring(0, '/edit/'.length) == '/edit/') {
		filePath = filePath.substr('/edit/'.length);
	}

	var storageDir = path.join(__dirname, '/storage/');
	filePath = path.join(storageDir, filePath);

	if (filePath == undefined || content == undefined || filePath.charAt(filePath.length - 1) == '/') {
		handleError(res, 500, false, filePath);
	} else if (!isFileInDirectory(filePath, storageDir, true)) {
		handleError(res, 550, false, filePath);
	} else {
		mkpath(filePath.substring(0, filePath.lastIndexOf('/')), function (err) {
			if (err) {
				handleError(res, 500, false, filePath);
			} else {
				fs.write(filePath, content, function(err) {
					if (err) {
						handleError(res, 500, false, filePath);
					} else {
						res.writeHead(200, headers);
						res.end();
					}
				});
			}
		});
	}
});


app.get('*', function(req, res, next) {
	var filePath = returnFilePath(req, '/static/');
	if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
		filePath = path.join(filePath,'/index.html');
	}

	returnFile(filePath, res, 200);
});

var server = app.listen(8081, function() {
	console.log("Listening on port %d", server.address().port);
});

function returnFilePath(req, parentDir, substr_index) {
	var uri;
	if (typeof(req) == 'string') {
		uri = req;
	}
	else {
		uri = url.parse(req.url).pathname;
	}

	if (!uri) {
		return false;
	}

	if (substr_index) {
		uri = uri.substr(substr_index);
	}

	return path.join(__dirname, parentDir, uri);
}

function returnFile(filePath, res, statusCode, dir) {
	if (!statusCode) {
		statusCode = 200;
	}

	fs.readFile(filePath, "binary", function(err, file) {
		if (err) {
			handleError(res, 500, true);
			return false;
		}

		var headers = {}
		// set content type
		type = mime.lookup(filePath);
		if (!res.getHeader('Content-Type')) {
			var charset = mime.charsets.lookup(type);
			headers['Content-Type'] = type + (charset ? '; charset=' + charset : '');
		}

		if (dir) { // if we're returning a directory page
			fs.readdir(dir, function(err, files) {
				if (err) {
					handleError(res, 500, true);
					return;
				}

				file = file.toString();
				var ind = file.indexOf('<script type=\'text/javascript\'>');

				for (var i in files) {
					if (fs.statSync(path.join(dir, files[i])).isDirectory()) {
						files[i] += '/';
					}
				}

				file = file.substring(0, ind) + "<script type='text/javascript'>var dirs = " + JSON.stringify(files) + ";</script>" + file.substr(ind);
				res.writeHead(statusCode, headers);
				res.write(new Buffer(file), "binary");
				res.end();
			});
			return;
		}

		res.writeHead(statusCode, headers);
		res.write(file, "binary");
		res.end();
	});
}

var errorResponses = {
	404:'Error: 404 Not found',
	500:'Error: Internal error',
	550:'Error: Permission denied'
};

var errorFiles = {
	404:path.join(__dirname, '/static/errors/404.html'),
	500:path.join(__dirname, '/static/errors/500.html'),
	550:path.join(__dirname, '/static/errors/550.html')
};

function handleError(res, type, html, path) {
	// 404 = not found
	// 500 = internal error
	// 550 = permission denied
	var headers = {}
	if (html) {
		headers['Content-Type'] = 'text/html';
	} else {
		headers['Content-Type'] = 'text/plain';
		res.writeHead(type, headers);
		if (path) {
			res.end(errorResponses[type] + ": " + path);
		}
		else {
			res.end(errorResponses[type]);
		}
		return;
	}

	returnFile(errorFiles[type], res, type);
}

function getURLParts(req) {
	var url_parts = url.parse(req.url, true);
	var query = url_parts.query;
}

function isFileInDirectory(file, dir, notTopLevel) {
	file = fs.realpathSync(file);
	dir = fs.realpathSync(dir);
	var isInDir = file.indexOf(dir) == 0;
	if (notTopLevel) {
		return isInDir && file.substr(dir.length + 1).indexOf('/') == -1;
	} else {
		return isInDir;
	}
}