window.name = 'parent';
var devUtilsOpen = false;
var windowURL = window.location.href; 
var url = '';
var devLoaded = function(){ 
	otherWinRef = window.open("","parent");
	otherWinRef.Bounce(window);
	window.focus();
	alert('Remote Access Libraries Loaded');
 };

window.onbeforeunload = function(e) {
	devUtils.close();
};

function Bounce(w) {
        window.blur();
        w.focus();
}

