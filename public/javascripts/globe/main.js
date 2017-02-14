// ----------
var GlobeMain = {
    blue: '#1fafcd',
    darkBlue: '#105a69',
    yellow: '#ffd953',
    slowTime: 1000,
    slowerTime: 2000,
    fastTime: 400,

    // ----------
    init: function() {
        var self = this;

        var offsetY = document.getElementsByClassName("map-container")[0].offsetTop + document.getElementsByClassName("navbar-brand-container")[0].clientHeight;
        document.getElementsByClassName('map-container')[0].style.height = window.innerHeight - offsetY + "px";

        this.scale = 1;
        
        var lines = _.uniqBy(flightPaths, function(v, i) {
            return '' + v.origin.lat + 'x' + v.origin.lon + 'x' +
                v.destination.lat + 'x' + v.destination.lon;
        });

        lines = _.map(lines, function(v, i) {
            return {
                start: {
                    lat: parseFloat(v.origin.lat),
                    lng: parseFloat(v.origin.lon)
                },
                end: {
                    lat: parseFloat(v.destination.lat),
                    lng: parseFloat(v.destination.lon)
                }
            };
        });
        
        var points = [];
        _.each(lines, function(v, i) {
            points.push(v.start);
            points.push(v.end);
        });
        
        points = _.uniqBy(points, function(v, i) {
            return '' + v.lat + 'x' + v.lng;
        });
        
        this.globeView = new GlobeMain.GlobeView({
            $el: $('#globe'),
            points: points,
            lines: lines,
            onNodeClick: function(pointNode) {
                // TODO: We've hard-coded o_lat and o_lon here, but we should be getting it from the server
                // TODO: Ultimately it would be good to be able to also include things by destination as well as origin
                var routePath = routePath_withoutFilter.replace(/globe/i, 'gallery');
                var queryParamJoinChar = routePath.indexOf('?') !== -1? '&' : '?';
                var latFilterString = $.param(constructedFilterObj(filterObj, 'o_lat', pointNode.lat, false));
                var lonFilterString = $.param(constructedFilterObj(filterObj, 'o_lon', pointNode.lng, false));
                var urlForFilterValue = routePath + queryParamJoinChar + latFilterString + '&' + lonFilterString;

                window.location = urlForFilterValue;
                // pointNode.select();
            }
        });

        this.globeView.start();
        this.globeView.animateLinesOn();
    },
    
    // ----------
    coordToVector: function(lat, lng, radius) {
        var phi = (90 - lat) * Math.PI / 180;
        var theta = (180 - lng) * Math.PI / 180;

        return new THREE.Vector3(radius * Math.sin(phi) * Math.cos(theta),
            radius * Math.cos(phi),
            radius * Math.sin(phi) * Math.sin(theta));
    },

    // ----------
    // TODO: Support touch
    on: function(eventName, $el, handler, name) {
        $el.on(eventName, handler);
    },

    // ----------
    // TODO: Support touch
    off: function(eventName, $el, handler, name) {
        $el.off(eventName, handler);
    }
};

// ----------
$(document).ready(function() {
    GlobeMain.init();
});
