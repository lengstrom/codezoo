var http = require("http"),
	url = require("url"),
	path = require("path"),
	fs = require("fs")
	port = process.argv[2] || 8081;

var contentTypesByExtension = {
	'.html':"text/html",
	'.css':"text/css",
	'.js':"text/javascript"
};

http.createServer(function(request, res) {
	var action = parseAction(request.url);
	var overallAction;

	switch (action.type) {
		case 'view':
			handleRead(action.data, res);
			break;

		case 'edit':
			handleEdit(action.data, res)
			break;

		case 'write':
			handleWrite(action.data, res);
			break;

		case 'read':
		console.log(action)
			handleRead(action.data.path, res)
			break;

		default:
			throw {message:'Unknown action type', name:"Unknown Action"};
	}
}).listen(parseInt(port, 10));

function handleRead(filePath, res) {
	var baseDir = process.cwd();
	filePath = path.join(baseDir, filePath);

	fs.exists(filePath, function(exists) {
		if(!exists) {
			fs.readFile(path.join(baseDir, '404.html'));
			res.writeHead(404, {"Content-Type": "text/plain"});
			res.write("404 Not Found\n");
			res.end();
			return;
		}

		if (fs.statSync(filePath).isDirectory()) {
			filePath = path.join(baseDir,'/static/directory.html');
		}
	});
}

function loadFile(filePath, res) {
	fs.readFile(filePath, "binary", function(err, file) {
		if (err) {
			res.writeHead(500, {"Content-Type": "text/plain"});
			res.write(err + "\n");
			res.end();
			return;
		}

		var headers = {};
		var contentType = contentTypesByExtension[path.extname(filePath)];
		if (contentType) headers["Content-Type"] = contentType;
		res.writeHead(200, headers);
		res.write(file, "binary");
		res.end();
	});
}

function parseAction(requestURL) {
	var uri = url.parse(requestURL).pathname;
	if (uri == '/') {
		return makeAction('/static/index.html', 'view');
	}

	if (uri.indexOf('/view/') == 0) {
		return makeAction('/storage' + uri.substr(5), 'view');
	}

	if (uri.indexOf('/edit/') == 0) {
		return makeAction('/storage' + uri.substr(5), 'edit');
	}

	if (uri.indexOf('/write') == 0) {
		return makeAction(getURLParts(requestURL), 'write');
	}

	if (uri.indexOf('/read') == 0) {
		return makeAction(getURLParts(requestURL), 'read');
	}

	return makeAction(path.join('/static' + uri), 'view');
}

function getURLParts(requestURL) {
	var url_parts = url.parse(requestURL, true);
	var query = url_parts.query;
}

function makeAction(requestURL, action) {
	return {data:requestURL, type:action};
}