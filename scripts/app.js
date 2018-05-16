// define globals
var weekly_quakes_endpoint = "http://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_week.geojson";
var monthly_quakes_endpoint =
"https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_month.geojson";

var map, markers = [];
var time = "weekly";

//From google maps API documentation
function initMap() {
  map = new google.maps.Map(document.getElementById('map'), {
	 center: {lat: 37.7749, lng: -122.4194},
	 zoom: 8
 });
}

$(document).ready(function() {
	//Object allowing us to quickly access unchanging elements on the page (so we don't have to use their jquery selector)
	var el = {
		quakeList: $('#quakelist'),
		timeSelector: $('#timeselector')
	}

	function getQuakes(timespan) {
		var url;

		//Determine which endpoint we want to use, based on user's selection
		if (timespan === "weekly") {
			url = weekly_quakes_endpoint;
		} else {
			url = monthly_quakes_endpoint;
		}

		$.ajax({
			method: 'GET',
			url: url,
			success: function(resp) {
				var now = new Date(); //We will use this to determine how long it has been since the quake

				resp.features.forEach(function(quake) {
					//Get time since quake and convert it to hours
					var hoursAgo = (now.valueOf() - quake.properties.time) / 1000 / 60 / 60; // ms / (ms/sec) / (sec/min) / (min/hr)
					var timeString = hoursAgo < 24 ? 'hours' : 'days'; //so we can convert to days in output string

					//Strip out the additional location information telling us how far from closest city (if it is formatted that way - "__km DIR of place")
					var place = quake.properties.place;
					if (place.indexOf(' of ') !== -1) {
						place = place.substring(place.indexOf(' of ') + 4)
					}

					//Add quake to our quakelist
					el.quakeList.append(`<p id="${quake.id}">M ${quake.properties.mag} - ${place} / ${hoursAgo < 24 ? hoursAgo.toFixed(1) : (hoursAgo/24).toFixed(1)} ${timeString} ago</p>`);

					//Set up quake icon size for display on google maps embed. Larger icons for stronger quakes
					var iconScale;
					if (quake.properties.mag > 7) {
						iconScale = new google.maps.Size(50,50);
					} else if (quake.properties.mag > 5) {
						iconScale = new google.maps.Size(30,30);
					} else {
						iconScale = new google.maps.Size(20,20);
					}

					//Add quake icon to google maps embed
					var marker = new google.maps.Marker({
						position: new google.maps.LatLng(quake.geometry.coordinates[1],quake.geometry.coordinates[0]),
						map: map,
						title: `M ${quake.properties.mag}`,
						icon: {
							url: "images/earthquake.png", // url
							scaledSize: iconScale, // scaled size
							origin: new google.maps.Point(0,0), // origin
							anchor: new google.maps.Point(0,0) // anchor
						},
						id: quake.id, //Add id so we know which p tag holds the quake details for this marker
					})

					//Add listeners so we can scroll to the p tag with details when hover over pin
					marker.addListener('mouseover', function(e) {
						var activeQuake = $(`#${this.id}`);
						activeQuake.addClass('active');

						//Calculate how long the transition should take so, no matter how far we need to scroll, we go about the same speed
						var transitionTime = (Math.abs(window.scrollY - activeQuake.position().top - 100));
						$('html, body').animate({
							scrollTop: (activeQuake.position().top - 100)
						}, transitionTime);
					});

					marker.addListener('mouseout', function(e) {
						$(`#${this.id}`).removeClass('active');
					});

					//Keep track of current markers so we can remove them when we update the listeners
					markers.push(marker);
				})
			},
			error: function(xhr, status, err) {
				console.log('Error getting weekly quakes!');
			}
		})
	}

	//Handle the user toggling the selector from top quakes of the week to month and vice versa
	el.timeSelector.on('click', function() {
		if(time === "weekly") {
			time = "monthly";
			el.timeSelector.text('month');
		} else {
			time = "weekly";
			el.timeSelector.text('week');
		}
		clearOverlays(); //Remove markers from map
		el.quakeList.empty(); //Remove all previously rendered quakes from our list
		getQuakes(time); //Get new quakes
	});

	//https://stackoverflow.com/questions/1544739/google-maps-api-v3-how-to-remove-all-markers
	function clearOverlays() {
		for (var i = 0; i < markers.length; i++ ) {
			markers[i].setMap(null);
		}
		markers.length = 0;
	}

	//Initalize the page for the first time. These will only run once.
	getQuakes(time);
	initMap();
});
