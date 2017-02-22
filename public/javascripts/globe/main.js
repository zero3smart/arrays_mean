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

        this.$el = $('#globe');
        this.scale = 1;
        
        // console.time('load');
        
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
        
        var originCounts = _.countBy(flightPaths, function(v, i) {
            return v.origin.lat + 'x' + v.origin.lon;
        });
        
        var destinationCounts = _.countBy(flightPaths, function(v, i) {
            return v.destination.lat + 'x' + v.destination.lon;
        });
        
        _.each(points, function(v, i) {
            var key = v.lat + 'x' + v.lng;
            v.info = {
                originCount: originCounts[key] || 0,
                destinationCount: destinationCounts[key] || 0
            };
        });
        
        // console.timeEnd('load');
        
        var c = new THREE.Color(brandColor);
        c.r = 1 - c.r;
        c.g = 1 - c.g;
        c.b = 1 - c.b;
        var pointColor = c.getStyle();
        
        // c.lerp(new THREE.Color(0xffffff), 0.5);
        var lineColor = '#888'; //c.getStyle();
        
        this.globeView = new GlobeMain.GlobeView({
            $el: this.$el,
            points: points,
            lines: lines,
            landColor: brandColor,
            pointColor: pointColor,
            lineColor: lineColor,
            onNodeClick: function(pointNode) {
                // TODO: We've hard-coded o_lat and o_lon here, but we should be getting it from the server
                // TODO: Ultimately it would be good to be able to also include things by destination as well as origin
                var routePath = routePath_withoutFilter.replace(/globe/i, 'gallery');
                var queryParamJoinChar = routePath.indexOf('?') !== -1? '&' : '?';
                var filterString = $.param(constructedFilterObj(filterObj, ['o_lat', 'o_lon'], [pointNode.lat, pointNode.lng], false));
                var urlForFilterValue = routePath + queryParamJoinChar + filterString;

                window.location = urlForFilterValue;
                // pointNode.select();
            }
        });

        this.globeView.start();
        
        this.$el.on('wheel', function(event) {
            event.preventDefault();
            
            var delta = event.originalEvent.deltaY;
            if (!delta) {
                delta = -event.originalEvent.wheelDelta;
            }
            
            if (delta < 0) {
                self.globeView.zoomIn();
            } else if (delta > 0) {
                self.globeView.zoomOut();
            }
        });
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
