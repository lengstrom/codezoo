var express = require('express');
var mkpath = require('mkpath');
var mime = require('mime');
var url = require('url');
var bodyParser = require('body-parser')
var fs = require('fs');
var path = require('path');
var morgan = require('morgan')
var ncp = require('ncp').ncp;

var app = express();
var storageDir = path.join(__dirname, '/storage/');

ncp.limit = 16;

app.use(morgan(':remote-addr :method :url'))
app.get('/', function(req, res) {
	res.redirect('/view/');
	return;
});

app.get('/edit*', function(req, res) {
	var filePath = returnFilePath(req, '/storage', '/edit'.length)
	if (filePath.charAt(filePath.length - 1) == '/') {
		var uri = url.parse(req.url).pathname;
		res.redirect(path.join('/view', uri.substr('/edit'.length)));
		return;
	}

	if (isFileInDirectory(filePath,path.join(__dirname, '/storage'), true)) {
		if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
			var uri = url.parse(req.url).pathname;
			res.redirect(path.join('/view', uri.substr('/edit'.length)));
		} else {
			returnFile(path.join(__dirname,'/static/edit.html'), res, 200, {file:filePath});
		}
	} else {
		var uri = url.parse(req.url).pathname;
		res.redirect(path.join('/view', uri.substr('/edit'.length)));
	}
});

app.get('/view*', function(req, res) {
	var filePath = returnFilePath(req, '/storage', '/view'.length)
	if (!fs.existsSync(filePath)) {
		filePath = path.join(__dirname, '/static/dir.html');
		returnFile(filePath, res, 200);
	} else {
		if (isFileInDirectory(filePath,path.join(__dirname, '/storage'))) {
			if (fs.statSync(filePath).isDirectory()) {
				returnFile(path.join(__dirname, '/static/dir.html'), res, 200, {dir:filePath});
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

	if (filePath.substring(0, '/edit'.length) == '/edit') {
		filePath = filePath.substr('/edit'.length);
	}

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
				fs.writeFile(filePath, content, function(err) {
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

app.post('/copy*', function(req, res) {
	var origin = path.join(storageDir,req.body.origin);
	var target = path.join(storageDir,req.body.target);
	var headers = {
		'Content-Type':'text/plain'
	};

	if (isFileInDirectory(origin, storageDir, false) && isFileInDirectory(target, storageDir, true)) {
		mkpath(target.substring(0, target.lastIndexOf('/')), function (err) {
			if (err) {
				if (err) {
					handleError(res, 500, false);
					return;
				}
			}

			ncp(origin, target, function (err) {
				if (err) {
					handleError(res, 500, false);
					return;
				}

				res.writeHead(200, headers);
				res.end();
			});
		});
	} else {
		handleError(res, 550, false);
	}
});

app.get('*', function(req, res, next) {
	if (req.url.indexOf('/static') != 0) {
		req.url = path.join('/static', req.url);
	}

	var filePath = returnFilePath(req, '');
	if (isFileInDirectory(filePath, path.join(__dirname, '/static'), false)) {
		if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
			filePath = path.join(filePath,'/index.html');
		}

		returnFile(filePath, res, 200);
	}
	else {
		handleError(res, 550, true, filePath);
	}

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

function returnFile(filePath, res, statusCode, opts) {
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

		if (opts) {
			if (opts.dir) { // if we're returning a directory page
				fs.readdir(opts.dir, function(err, files) {
					if (err) {
						handleError(res, 500, true, opts.dir);
						return;
					}
	
					file = file.toString();
					var ind = file.indexOf('<script type=\'text/javascript\'>');
	
					for (var i in files) {
						if (fs.statSync(path.join(opts.dir, files[i])).isDirectory()) {
							files[i] += '/';
						}
					}
	
					file = file.substring(0, ind) + "<script type='text/javascript'>var dirsToLoad = " + JSON.stringify(files) + ";</script>" + file.substr(ind);
					res.writeHead(statusCode, headers);
					res.write(new Buffer(file), "binary");
					res.end();
				});
				return;
			}
	
			if (opts.file) {
				fs.readFile(opts.file, function(err, editFile) {
					if (err) {
						if (err.code == 'ENOENT') { // file not found
							res.writeHead(statusCode, headers);
							res.write(file, 'binary');
							res.end();
							return;
						} else {
							handleError(res, 500, true, opts.file);
							return;
						}
					}

					file = file.toString();
					var ind = file.indexOf('<script type=\'text/javascript\'>');
					file = file.substring(0, ind) + "<script type='text/javascript'>var contents = " + JSON.stringify(editFile.toString()) + ";</script>" + file.substr(ind);
					res.writeHead(statusCode, headers);
					res.write(new Buffer(file), "binary");
					res.end();
				});
				return;
			}
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
	return url_parts = url.parse(req.url, true).query;
}

function isFileInDirectory(file, dir, notTopLevel) {
	file = path.resolve(file);
	dir = path.resolve(dir);
	var isInDir = file.indexOf(dir) == 0;
	if (notTopLevel) {
		return (isInDir && !(file.substr(dir.length + 1).indexOf('/') == -1));
	} else {
		return isInDir;
	}
}