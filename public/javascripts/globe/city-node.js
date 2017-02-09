(function() {

    // ----------
    var component = GlobeMain.CityNode = function(config) {
        this.lat = config.lat;
        this.lng = config.lng;
        this.city = config.city;
        this.color = config.color;
        this.altitude = config.altitude;
        this.size = config.size;
        this.story = config.story;
        this.globe = config.globe;
        this._cityNodes = config.cityNodes;
        this._globeView = config.globeView;
        this._lines = [];
        this._viewed = false;
        this._glowAttached = false;

        var vector = GlobeMain.coordToVector(this.lat, this.lng, this.altitude);

        // node
        var material = new THREE.MeshBasicMaterial({
            color: this.color,
            transparent: true,
            opacity: config.opacity === undefined ? 1 : config.opacity
        });

        var geometry = new THREE.SphereGeometry(this.size, 20, 20);
        this.node = new THREE.Mesh(geometry, material);
        this.node.position.x = vector.x;
        this.node.position.y = vector.y;
        this.node.position.z = vector.z;

        this.globe.scene.add(this.node);

        // glow
        material = new THREE.MeshBasicMaterial({
            color: this.color,
            transparent: true,
            opacity: 0.1
        });

        geometry = new THREE.SphereGeometry(this.size, 20, 20);
        this.glow = new THREE.Mesh(geometry, material);
        this.glow.position.x = vector.x;
        this.glow.position.y = vector.y;
        this.glow.position.z = vector.z;

        if (this.story) {
            this._setGlow(true);
        }
    };

    // ----------
    component.prototype = {
        // ----------
        select: function() {
            var self = this;

            // Highlight the node
            this._selected = true;
            this._update();

            // Draw the lines
            var lineConfig = {
                globe: this.globe,
                start: {
                    point: {
                        lat: this.lat,
                        lng: this.lng
                    },
                    altitude: this.altitude,
                    color: GlobeMain.yellow
                },
                end: {
                    color: GlobeMain.blue
                }
            };

            var endPointCityNodes = _.filter(this._cityNodes, function(v, i) {
                return (v !== self && _.findWhere(self.story.locations, { city: v.city }));
            });

            _.each(endPointCityNodes, function(v, i) {
                lineConfig.end.point = {
                    lat: v.lat,
                    lng: v.lng
                };

                lineConfig.end.altitude = v.altitude;

                var line = new GlobeMain.Line(lineConfig);
                line.animateOn();
                self._lines.push(line);
            });
        },

        // ----------
        deselect: function() {
            this._selected = false;
            this._update();

            _.each(this._lines, function(v, i) {
                v.destroy();
            });

            this._lines = [];
        },

        // ----------
        viewed: function(value) {
            this._viewed = value;
            this._update();
        },

        // ----------
        _update: function() {
            this.node.material.color.setStyle(this._selected || !this._viewed ? GlobeMain.yellow : '#10516D');

            this._setGlow(this._selected || !this._viewed);
        },

        // ----------
        _setGlow: function(value) {
            if (this._glowAttached === value) {
                return;
            }

            this._glowAttached = value;

            if (this._glowAttached) {
                this.globe.scene.add(this.glow);
            } else {
                this.globe.scene.remove(this.glow);
            }
        },

        // ----------
        disabled: function(value) {
            var self = this;

            if (value === undefined) {
                return this._disabled;
            }

            this._disabled = value;

            new TWEEN.Tween({
                    nodeOpacity: this.node.material.opacity,
                    glowOpacity: this.glow.material.opacity
                })
                .to({
                    nodeOpacity: this._disabled ? 0.2 : 1,
                    glowOpacity: this._disabled ? 0 : 0.1
                }, GlobeMain.fastTime)
                .easing(TWEEN.Easing.Linear.None)
                .onUpdate(function() {
                    var tween = this;
                    self.node.material.opacity = tween.nodeOpacity;
                    self.glow.material.opacity = tween.glowOpacity;
                })
                .start();
        }
    };

})();
