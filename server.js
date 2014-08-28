var express = require('express'),
	passport = require('passport'),
	touch = require("touch"),
	mkpath = require('mkpath'),
	methodOverride = require('method-override'),
	cookieParser = require('cookie-parser')
	rimraf = require('rimraf'),
	GoogleStrategy = require('passport-google-oauth').OAuth2Strategy,
	mime = require('mime'),
	session = require('express-session'),
	url = require('url'),
	bodyParser = require('body-parser'),
	fs = require('fs'),
	path = require('path'),
	morgan = require('morgan'),
	ncp = require('ncp').ncp;

var app = express();
var storageDir = path.join(__dirname, '/storage/');

var GOOGLE_CLIENT_ID = process.env.clientID;
var GOOGLE_CLIENT_SECRET = process.env.clientSecret;

var WEB_ADDRESS = process.env.webAddress;

ncp.limit = 16;
var userDict = {};
(function(){
	var userDir = path.join(__dirname, 'users.csv');
	if (!fs.existsSync(userDir)) {
		touch.sync(userDir);
	}

	var userList = fs.readFileSync(userDir).toString().split('\n').map(function(a){return a.split(',')});
	for (var i in userList) {
		userDict[i[0]] = i[1];
	}
})();

function addUser(id, userName) {
	if (userList[id] != undefined) {
		return false;
	}

	userList[id] = userName;
	fs.appendFile(path.join(dirname__, 'users.csv'), '\n' + id + ',' + userName);
	return true;
}

passport.serializeUser(function(user, done) {
	done(null, user);
});

passport.deserializeUser(function(obj, done) {
	done(null, obj);
});

passport.use(new GoogleStrategy({
	clientID: GOOGLE_CLIENT_ID,
	clientSecret: GOOGLE_CLIENT_SECRET,
	callbackURL: path.join(WEB_ADDRESS + "/oauth2callback")
	},
	function(accessToken, refreshToken, profile, done) {
		// asynchronous verification, for effect...
		process.nextTick(function () {
			return done(null, profile);
		});
	}
));


app.use(morgan(':remote-addr :method :url'));
app.use(bodyParser.json()); // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({ // to support URL-encoded bodies
	extended:true
}));

app.use(cookieParser());
app.use(methodOverride());
app.use(session({secret:'keyboard cat'}));

// Initialize Passport!  Also use passport.session() middleware, to support
// persistent login sessions (recommended).
app.use(passport.initialize());
app.use(passport.session());

app.get('/oauth2callback', 
	passport.authenticate('google', { failureRedirect: '/login' }),
	function(req, res) {
		addUser(req.user.id, 'logan');
		res.redirect('/');
	}
);

app.get('/auth/google',
	passport.authenticate('google', {scope:['https://www.googleapis.com/auth/userinfo.profile','https://www.googleapis.com/auth/userinfo.email']}),
	function(req, res){
	// The request will be redirected to Google for authentication, so this
	// function will not be called.
	}
);

app.get('/logout', function(req, res){
	req.logout();
	res.redirect('/');
});

function ensureAuthenticated(req, res, next) {
	if (req.isAuthenticated()) { return next(); }
	res.redirect('/login');
}

////

app.get('/', function(req, res) {
	res.redirect('/view/');
	return;
});

app.get('/edit*', function(req, res) {
	var filePath = returnFilePath(req, '/storage', '/edit'.length);
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
			returnFile(path.join(__dirname,'/static/edit.html'), res, 200, req, {file:filePath, userStatus:true});
		}
	} else {
		var uri = url.parse(req.url).pathname;
		res.redirect('/view');
	}
});

app.get('/view*', function(req, res) {
	var filePath = returnFilePath(req, '/storage', '/view'.length)
	if (!fs.existsSync(filePath)) {
		returnFile(path.join(__dirname, '/static/dir.html'), res, 200, req, {userStatus:true});
	} else {
		if (isFileInDirectory(filePath,path.join(__dirname, '/storage'))) {
			if (fs.statSync(filePath).isDirectory()) {
				returnFile(path.join(__dirname, '/static/dir.html'), res, 200, req, {dir:filePath, userStatus: true});
			} else {
				returnFile(filePath, res, 200, {userStatus:true});
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

app.post('/delete*', function(req, res) {
	var target = path.join(storageDir,req.body.target);
	var headers = {
		'Content-Type':'text/plain'
	};

	if (isFileInDirectory(target, storageDir, false)) {
		rimraf(target, function(err) {
			if (err) {
				handleError(res, 500, false);
			} else {
				res.writeHead(200, headers);
				res.end();
			}
		});
	} else {
		handleError(res, 550, false);
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

function returnFile(filePath, res, statusCode, req, opts) {
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

					initialJS = "var dirsToLoad = " + JSON.stringify(files) + ";";
					initialJS += returnUserInfo(req);

					file = file.substring(0, ind) + "<script type='text/javascript'>" + initialJS + "</script>" + file.substr(ind);
					res.writeHead(statusCode, headers);
					if (opts.user) {

					}

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
					var initialJS = "var contents = " + JSON.stringify(file) + ';';
					initialJS += returnUserInfo(req);
					file = file.substring(0, ind) + "<script type='text/javascript'>" + initialJS + "</script>" + file.substr(ind);
					res.writeHead(statusCode, headers);
					if (opts.user) {

					}

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

function returnUserInfo(req) {
	if (req.user && req.user.id) {
		return 'var user = ' + JSON.stringify({account:userDict[req.user.id]}) + ';'
	} else {
		return ''
	}
}

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