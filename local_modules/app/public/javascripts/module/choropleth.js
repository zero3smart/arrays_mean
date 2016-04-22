/**
 * Initialize variables
 */
var layer = 'contour',
	metric = 'total',
	numBreaks = 10, // How many layers of opacity values there should be
	topValue = 100, // This should be the highest "total" value in the data
	filteruse,
	breaks = [],
	opacities = [],
	names = [];

/**
 * Generate layer breakpoints, layer names, and opacity values;
 */
for (i = 0; i < numBreaks; i++) {
	breaks[i] = Math.round(topValue * (i / numBreaks)).toString(); // Only works when string
	opacities[i] = (i / numBreaks);
	names[i] = 'layer-' + i;
}

/**
 * Mapbox access token
 */
mapboxgl.accessToken = 'pk.eyJ1Ijoic2NoZW1hIiwiYSI6IjAxcE9MMlkifQ.Kljao5iyXhySu2qYbtw-_A';

/**
 * Create map, set style and centering
 */
var map = new mapboxgl.Map({
	container: 'map',
	style: 'mapbox://styles/schema/cinavisv200i4bckv2fb6atgp',
	center: [0, 35],
	zoom: 1.5 // starting zoom
});

/**
 * On load map
 */
map.on('load', function () {

	/**
	 * Add source data to map
	 */
	map.addSource('countries', {
		type: 'geojson',
		data: geoData
	});

	/**
	 * Loop through layers, filter countries, and apply opacity
	 * NOTE: this only works when break values are strings, not integers
	 */
	for (i = 0; i < numBreaks; i++) {
		if (i < numBreaks - 1) {
			filteruse = ['all', ['>=', metric, breaks[i]], ['<', metric, breaks[i + 1]]];
		} else {
			filteruse = ['>=', metric, breaks[i]];
		}

		map.addLayer({
			id: names[i],
			type: 'fill',
			source: 'countries',
			'source-layer': layer,
			filter: filteruse,
			paint: {
				'fill-color': '#00DAE5',
				'fill-opacity': opacities[i]
			}
		});
	}
});