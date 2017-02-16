(function() {

    // ----------
    var component = GlobeMain.Line = function(config) {
        this._start = _.clone(config.start);
        this._end = _.clone(config.end);
        this._globe = config.globe;
        this._sublines = [];
        this.animating = false;
        this._separateSegments = (this._start.color !== this._end.color);
        this._segmentCount = 40;
        this._arcAltitude = config.arcAltitude;
        
        if (Math.abs(this._end.point.lng - this._start.point.lng) > 180) {
            if (this._end.point.lng > this._start.point.lng) {
                this._end.point.lng -= 360;
            } else {
                this._start.point.lng -= 360;
            }
        }

        if (this._separateSegments) {
            var color;
            var endColor = new THREE.Color(this._end.color);
            for (var i = 0; i < this._segmentCount; i++) {
                color = new THREE.Color(this._start.color).lerp(endColor, i / (this._segmentCount - 1));
                this._addSegment(color, 2);
            }
        } else {
            this._addSegment(this._start.color, this._segmentCount + 1);
        }
        
        this._build();
    };

    // ----------
    component.prototype = {
        // ----------
        destroy: function() {
            var self = this;

            this.animateOff(function() {
                _.each(self._sublines, function(v, i) {
                    self._globe.scene.remove(v);
                });

                self._sublines = [];
            });
        },

        // ----------
        _addSegment: function(color, count) {
            var material = new THREE.LineBasicMaterial({
                color: color,
                linewidth: 2
            });

            var geometry = new THREE.Geometry();
            geometry.dynamic = true;

            for (var i = 0; i < count; i++) {
                geometry.vertices.push(GlobeMain.coordToVector(this._start.point.lat, this._start.point.lng, this._start.altitude));
            }

            var line = new THREE.Line(geometry, material);
            this._globe.scene.add(line);

            this._sublines.push(line);
        },
        
        // ----------
        _build: function() {
            var count = this._segmentCount + 1;
            var vertices = [];
            var latDiff = this._end.point.lat - this._start.point.lat;
            var lngDiff = this._end.point.lng - this._start.point.lng;
            var altitudeDiff = this._end.altitude - this._start.altitude;
            var factor, lat, lng, altitude, altitudeFactor;
            for (var i = 0; i < count; i++) {
                factor = (i / (count - 1));
                lat = this._start.point.lat + (latDiff * factor);
                lng = this._start.point.lng + (lngDiff * factor);

                altitude = this._start.altitude + (altitudeDiff * factor);
                altitudeFactor = Math.sin(factor * Math.PI);                
                altitude += this._arcAltitude * altitudeFactor;
                
                vertices.push(GlobeMain.coordToVector(lat, lng, altitude));
            }

            this._conformVertices(vertices);
        },

        // ----------
        _conformVertices: function(vertices) {
            if (this._separateSegments) {
                _.each(this._sublines, function(v, i) {
                    v.geometry.vertices[0] = vertices[i];
                    v.geometry.vertices[1] = vertices[i + 1];
                    v.geometry.verticesNeedUpdate = true;
                });
            } else {
                var line = this._sublines[0];
                _.each(vertices, function(v, i) {
                    line.geometry.vertices[i] = v;
                });

                line.geometry.verticesNeedUpdate = true;
            }
        }
    };

})();
