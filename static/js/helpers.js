function join() {
	var parts = [];
	for (var i = 0, l = arguments.length; i < l; i++) {
		parts = parts.concat(arguments[i].split("/"));
	}

	var newParts = [];
	for (i = 0, l = parts.length; i < l; i++) {
		var part = parts[i];
		if (!part || part === ".") continue;
		if (part === "..") newParts.pop();
		else newParts.push(part);
	}

	if (parts[0] === "") newParts.unshift("");
	return newParts.join("/") || (newParts.length ? "/" : ".");
}

function getWritePath() {
	var currentPath = window.location.pathname;
	return currentPath.substr(currentPath.indexOf('/edit/') + '/edit/'.length)
}

function saveFile(cb) {
	$.post('/write',{content:editor.getSession().getValue(), path:window.location.pathname}, cb);
}