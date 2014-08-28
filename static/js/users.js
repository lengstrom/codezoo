if (user && user.username) {
	var account = $("<div>", {class:'button', text:'account'});
	var logOut = $("<div>", {class:'button', text:'log out'});
	account.click(function(){
		window.location = '/account';
	});

	logOut.click(function(){
		window.location = '/logout';
	});

	$('.buttons').append(account);
	$('.buttons').append(logOut);
	
} else {
	var logIn = $("<div>", {class:'button', text:'log in'});
	logIn.click(function(){
		window.location = '/auth/google'
	})

	$('.buttons').append(logIn);
}