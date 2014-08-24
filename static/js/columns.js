var prevSepPos = -1;
hideColumns();

$('#separator').bind('mousedown', function(e) {
	document.body.style.cursor = 'ew-resize';
	$('#cover').css('z-index', '2');
	$(window).bind('mousemove', separatorMove);
});

$(window).bind('mouseup', separatorMouseUp);
$(window).resize(windowResize);

function toggleColumns() {
	if ($('#separator').is(":visible")) {
		hideColumns();
	} else {
		showColumns();
	}
}

function showColumns() {
	if (prevSepPos == -1) {
		// save(showColumns);
		prevSepPos = 0;
		// return;
	}
	var winWidth = $(window).width();
	$('#separator').show();
	$('#preview').attr('src', '/view/' + window.location.pathname.substr('/edit/'.length));
	$('#rcol').show();
	if (prevSepPos == 0) {
		prevSepPos = winWidth/2;
	}

	if (prevSepPos >= winWidth - 50) {
		prevSepPos = winWidth - 50;
	}

	separatorMove(false, prevSepPos);
}

function hideColumns() {
	$('#separator').hide();
	$('#preview').attr('src','');
	$('#lcol').css('width', '100%');
	$('#separator').hide();
}

function windowResize() {
	$('#rcol').css('width', parseInt($(window).width(), 10) - parseInt($('#lcol').width(), 10) - 7 + 'px');
}

function separatorMove(e, s) {
	var num;
	if (e) {
		num = e.clientX;
	}

	if (s) {
		num = s
	}

	prevSepPos = num;
	if (num < 150) { //set minimum width of left column to 150px
		$('#lcol').css('width', '140px'); //go to the lowest possible value if it is trying to be dragged smaller
		$('.searchbarCont').css('width' , '140px');
		$('#rcol').css('width', parseInt($(window).width(), 10) - parseInt($('#lcol').width(), 10) - 7 + 'px');
		return;
	}

	if (parseInt($(window).width(), 10) - num < 150) { //set minimum width of right column to 150px
		$('#lcol').css('width', parseInt($(window).width(), 10) - 144 + 'px'); //go to the lowest possible value if it is trying to be dragged smallerq
		$('.searchbarCont').css('width', $('#lcol').width() + 'px');
		$('#rcol').css('width', parseInt($(window).width(), 10) - parseInt($('#lcol').width(), 10) - 7 + 'px');
		return;
	}

	$('#lcol').css('width', num - 3 + 'px');
	$('.searchbarCont').css('width', $('#lcol').width() + 'px');
	$('#rcol').css('width', parseInt($(window).width(), 10) - num - 4 + 'px');
}

function separatorMouseUp(e) {
	document.body.style.cursor = '';
	$('#cover').css('z-index', '-1');
	$(window).unbind('mousemove', separatorMove);
}