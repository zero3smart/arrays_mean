/**
*Set container height for MapGL canvas
**/
//.navbar-brand-container is fixed so it's height needs to be part of the calculation
var offsetY = document.getElementsByClassName("map-container")[0].offsetTop + document.getElementsByClassName("navbar-brand-container")[0].clientHeight;
var mapContainer = document.getElementsByClassName('map-container')[0];
mapContainer.style.height = window.innerHeight - offsetY + "px";

/**
 * Initialize variables
 */
var layer = 'contour',
    metric = 'total',
    numBreaks = 100, // How many layers of opacity values there should be
    topValue = parseInt(templateOutput_topValue), // This should be the highest "total" value in the data
    coordMinMax = templateOutput_coordMinMax,
    filteruse,
    mapStyle,
    breaks = [],
    defaultRadius = 2,
    maxRadius = 40, // At 0 zoom
    radii = [],
    opacities = [],
    names = [],
    logOffset;

logOffset = coordMinMax.min < 0 ? Math.abs(coordMinMax.min - 1) : 0;

/**
 * Logarithmic scale
 */
function logScale(currentBreak, numBreaks, maxValue, minValue) {
    // current break will be between 0 and numBreaks
    var minp = 0;
    var maxp = numBreaks;

    var minv,
        maxv,
        logMax = maxValue + logOffset,
        logMin = isCoordMap ? minValue + logOffset : 1;
    console.log('logMin', logMin);
    // The result should be between 1 an topValue
    minv = Math.log(logMin); 
    maxv = Math.log(logMax);

    // calculate adjustment factor
    var scale = (maxv - minv) / (maxp - minp);

    return Math.exp(minv + scale * (currentBreak - minp));
}

function linearScale(currentBreak, numBreaks, maxValue, minValue) {
    var diff = maxValue - minValue,
        interval = diff / numBreaks;

    return interval * currentBreak;
}

/**
 * Generate layer breakpoints, layer names, and opacity values;
 */
for (i = 0; i < numBreaks; i++) {
    if (isCoordMap && applyCoordRadius) {
        breaks[i] = linearScale(i, numBreaks, coordMinMax.max, coordMinMax.min); 
        radii[i] = (i / numBreaks) * maxRadius + (maxRadius / numBreaks);
    } else {
        breaks[i] = logScale(i, numBreaks, topValue);
        opacities[i] = (i / numBreaks);
    }

    names[i] = 'layer-' + i;
}

/**
 * Mapbox access token
 */
mapboxgl.accessToken = 'pk.eyJ1Ijoic2NoZW1hIiwiYSI6IjAxcE9MMlkifQ.Kljao5iyXhySu2qYbtw-_A';

/**
 * Create map, set style and centering
 */

/*
-- styles --
basic: mapbox://styles/schema/cinavisv200i4bckv2fb6atgp
roads: mapbox://styles/schema/ciyurftt3003a2rqsh7xqectv
*/

mapStyle = isCoordMap ? 'mapbox://styles/schema/ciyurftt3003a2rqsh7xqectv' : 'mapbox://styles/schema/cinavisv200i4bckv2fb6atgp';

var map = new mapboxgl.Map({
    container: 'map',
    style: mapStyle,
    center: [0, 35],
    zoom: 1.5 // starting zoom
});

/**
 * Format popup span value for numbers
*/
function convertIntegerToReadable(prop) {
    if (typeof prop == 'number') {
        var splitNum = prop.toString().split('.'); 
        var number = splitNum[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        var decimal = splitNum[1] ? '.' + splitNum[1] : '';

        return number + decimal;
    }
    return prop;
}
/* Add number format to higher level helper/library file for reusability? */

/**
 * On load map
 */
map.on('load', function () {

    /**
     * Add source data to map
     */

    if (isCoordMap) {
        map.addSource('points', {
            type: 'geojson',
            data: coordData
        });
    } else {
        map.addSource('countries', {
            type: 'geojson',
            data: geoData
        });
    }

    /**
     * Loop through layers, filter countries, and apply opacity
     */
    if (isCoordMap && !applyCoordRadius) {

        names.push('points-of-interest');

        map.addLayer({
            id: names[0],
            type: 'circle',
            source: 'points',
            paint: {
                'circle-radius': {
                    stops: [
                        [0, defaultRadius],
                        [4, defaultRadius * 3],
                        [8, defaultRadius * 6],
                        [12, defaultRadius * 9],
                        [16, defaultRadius * 12],
                        [20, defaultRadius * 15]
                    ]
                },
                // 'circle-radius': radii[i],
                'circle-color': coordColor,
                'circle-opacity': 0.8
            }
        });

    } else {

        for (i = 0; i < numBreaks; i++) {
            if (i < numBreaks - 1) {
                filteruse = ['all', ['>=', metric, breaks[i] - logOffset], ['<', metric, breaks[i + 1] - logOffset]];
            } else {
                filteruse = ['>=', metric, breaks[i] - logOffset];
            }

            if (isCoordMap) {
                map.addLayer({
                    id: names[i],
                    type: 'circle',
                    source: 'points',
                    filter: filteruse,
                    paint: {
                        'circle-radius': {
                            stops: [
                                [0, radii[i]],
                                [4, radii[i] * 3],
                                [8, radii[i] * 6],
                                [12, radii[i] * 9],
                                [16, radii[i] * 12],
                                [20, radii[i] * 15]
                            ]
                        },
                        // 'circle-radius': radii[i],
                        'circle-color': coordColor,
                        'circle-opacity': 0.5
                    }
                });
            } else {            
              map.addLayer({
                  id: names[i],
                  type: 'fill',
                  source: 'countries',
                  'source-layer': layer,
                  filter: filteruse,
                  paint: {
                      'fill-color': brandColor,
                      'fill-opacity': opacities[i]
                  }
              }, 'water');
            }
        }

    }


    /**
     * Create a popup, but don't add it to the map yet
     */
    var popup = new mapboxgl.Popup({
        closeButton: false,
        closeOnClick: false
    });

    /**
     * Show popup on country hover
     */
    map.on('mousemove', function (e) {
        var features = map.queryRenderedFeatures(e.point, {layers: names});

        // Change cursor style
        map.getCanvas().style.cursor = (features.length) ? 'pointer' : '';

        if (!features.length) {
            popup.remove();
            return;
        }

        var feature = features[0];

        /**
         * Populate the popup and set its coordinates based on the feature found
         */
        if (isCoordMap && !applyCoordRadius) {
            popup.setLngLat(e.lngLat)
                .setHTML('<span class="popup-key">' + feature.properties.name + '</span>')
                .addTo(map);
        } else {            
            popup.setLngLat(e.lngLat)
                .setHTML('<span class="popup-key">' + feature.properties.name + '</span> <span class="popup-value">' + convertIntegerToReadable(feature.properties.total) + '</span>')
                .addTo(map);
        }
    });


    /**
     * Filter by country on click
     */
    if (isCoordMap) {
        if (galleryViewEnabled) {
            map.on('click', function (e) {
                var features = map.queryRenderedFeatures(e.point, {layers: names});

                var feature = features[0];

                var urlWithoutObjectId = routePath_withoutFilter.slice(0, routePath_withoutFilter.lastIndexOf('map'));

                window.location = urlWithoutObjectId + feature.properties.id;
            });
        }
    } else {
        map.on('click', function (e) {
            var features = map.queryRenderedFeatures(e.point, {layers: names});

            var feature = features[0];

            var queryParamJoinChar = routePath_withoutFilter.indexOf('?') !== -1 ? '&' : '?';

            var filterObjForThisFilterColVal;
            
            filterObjForThisFilterColVal = constructedFilterObj(filterObj, mapBy, feature.properties.name, false);
            var filterObjString = $.param(filterObjForThisFilterColVal);
            var urlForFilterValue = routePath_withoutFilter + queryParamJoinChar + filterObjString;

            window.location = urlForFilterValue;
        });
    }

    window.addEventListener('resize', function() {
        mapContainer.style.height = window.innerHeight - offsetY + "px";
    });
});

