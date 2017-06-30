
// document.addEventListener("DOMContentLoaded", function(event) {
// 		setTimeout(function() {
// 			window.opener.devLoaded();
// 			console.log('utils loaded');
// 		}, 1000);

// 	//your code to run since DOM is loaded and ready
// });


var airplane = function() {
	var quotes = [
		"I am serious... and don't call me Shirley",
		"This? Why, I can make a hat or a brooch or a pterodactyl...",
		"Joey, have you ever been in a... in a Turkish prison?",
		"Looks like I picked the wrong week to quit sniffing glue.",
		"Looks like I picked the wrong week to quit amphetamines.",
		"Alright, give me a Hamm on five, hold the Mayo.",
		"Roger, Roger. What's our vector, Victor?",
		"And Leon is getting laaaaarrrrrger.",
		"Jim never vomits at home.",
		"Looks like I picked the wrong week to quit drinking.",
		"Oh, it's a big pretty white plane with red stripes, curtains in the windows and wheels and it looks like a big Tylenol.",
		"Mayday!?! Why, that's the Russian New Year. We can have a parade and serve hot hors d'oeuvres...",
		"Joey, do you like movies about gladiators?",
		"Do you know what it's like to fall in the mud and get kicked... in the head... with an iron boot? Of course you don't, no one does. It never happens. Sorry, Ted, that's a dumb question... skip that.",
		"It was a rough place - the seediest dive on the wharf. Populated with every reject and cutthroat from Bombay to Calcutta. It's worse than Detroit.",
		"There's a sale at Penney's!",
		"I know but this guy has no flying experience at all. He's a menace to himself and everything else in the air... yes, birds too."
	];

	var min = 0;
	var max = quotes.length;

	return quotes[Math.floor(Math.random() * (max - min)) + min];
};

