mapboxgl.accessToken = 'pk.eyJ1Ijoic2NoZW1hIiwiYSI6IjAxcE9MMlkifQ.Kljao5iyXhySu2qYbtw-_A';

/**
 * Load countries data
 */
var countries = new mapboxgl.GeoJSONSource({
	data: '/data/lib/world.geo.json/countries.geo.json'
});

console.log(countries);

var choro = new mapboxgl.Map({
	container: 'map',
	style: 'mapbox://styles/mapbox/streets-v8',
	center: [0, 35],
  zoom: 1.5 // starting zoom
});