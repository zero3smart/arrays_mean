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
        'type': 'line',
        'source': 'countries',
        'source-layer': 'contour',
        'layout': {
            'line-join': 'round',
            'line-cap': 'round'
        },
        'paint': {
            'line-color': '#00DAE5',
            'line-width': 1
        }
    });
});