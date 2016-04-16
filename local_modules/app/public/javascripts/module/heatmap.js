mapboxgl.accessToken = 'pk.eyJ1Ijoic2NoZW1hIiwiYSI6IjAxcE9MMlkifQ.Kljao5iyXhySu2qYbtw-_A';

/**
 * Load countries data
 */
var countries = new mapboxgl.GeoJSONSource({
	data: '/data/lib/world.geo.json/countries.geo.json'
});

var map = new mapboxgl.Map({
	container: 'map',
	style: 'mapbox://styles/mapbox/light-v8',
	center: [0, 35],
zoom: 1.5 // starting zoom
});

map.on('load', function () {
	map.addSource('countries', countries);
	map.addLayer({
		'id': 'countries',
		'type': 'fill',
		'source': 'countries',
		'source-layer': 'contour',
		'layout': {
			'line-join': 'round',
			'line-cap': 'round'
		},
		'paint': {
			'fill-color': '#00DAE5',
			'fill-opacity': 0.5
		}
	});
});

var topValue = 3275;

function getOpacity(d) {
	return d > topValue * 0.9 ? 1 :
	d > topValue * 0.8  ? 0.9 :
	d > topValue * 0.7  ? 0.8 :
	d > topValue * 0.6  ? 0.7 :
	d > topValue * 0.5  ? 0.6 :
	d > topValue * 0.4  ? 0.5 :
	d > topValue * 0.3  ? 0.4 :
	d > topValue * 0.2  ? 0.3 :
	d > topValue * 0.1  ? 0.2 :
	d > topValue * 0    ? 0.1 :
	0;
}