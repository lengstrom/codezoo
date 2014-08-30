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

function isOwnerOfDir(n) {
	if (!('user' in window)) return 0;
	var loc = window.location.pathname;
	if (loc == n || loc == n + '/') {
		return -1;
	}

	loc = loc.substring((n + '/').length);
	if (loc.charAt(loc.length - 1) != '/') loc += '/';
	loc = loc.substring(0, loc.indexOf('/'));
	if (loc == user.account) {
		return 1;
	} else {
		return 0;
	}
}