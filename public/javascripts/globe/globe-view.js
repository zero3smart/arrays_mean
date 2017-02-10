(function() {

    // ----------
    var component = GlobeMain.GlobeView = function(config) {
        var self = this;

        this._onCityClick = config.onCityClick;
        this._onDeselectCity = config.onDeselectCity;
        this._onMouseDown = config.onMouseDown;
        this._onDrag = config.onDrag;
        this._onMouseUp = config.onMouseUp;

        this._cityNodes = [];
        this._pointNodes = [];
        this._lines = [];
        this._bottomAltitude = 200.5;
        this._topAltitude = 218;
        this._storyNodeScale = 2.15;
        this._storyGlowScale = 4.3;

        var i;

        this.shaders = {
            earthFront: {
                uniforms: {
                    texture: {
                        type: 't',
                        value: null
                    }
                },
                vertexShader: $.trim($('#earth-front-vertex-shader').text()),
                fragmentShader: $.trim($('#earth-front-fragment-shader').text())
            },
            earthBack: {
                uniforms: {
                    texture: {
                        type: 't',
                        value: null
                    }
                },
                vertexShader: $.trim($('#earth-back-vertex-shader').text()),
                fragmentShader: $.trim($('#earth-back-fragment-shader').text())
            },
            atmosphere: {
                uniforms: {
                    amplitude: { type: "f", value: 1.0 }
                },
                attributes: {
                    displacement: {
                        type: 'f',
                        value: []
                    }
                },
                vertexShader: $.trim($('#atmosphere-vertex-shader').text()),
                fragmentShader: $.trim($('#atmosphere-fragment-shader').text())
            }
        };

        this.$el = config.$el;
        this.globe = new DAT.Globe(this.$el[0], {
            imgDir: '/images/globe/',
            shaders: this.shaders,
            onBeforeRender: function(time) {
                TWEEN.update(time);
            },
            onMouseDown: function(event) {
                return self._onMouseDown ? self._onMouseDown(event) : false;
            },
            onDrag: function(event) {
                if (self._onDrag) {
                    self._onDrag(event);
                }
            },
            onMouseUp: function() {
                if (self._onMouseUp) {
                    self._onMouseUp();
                }
            }
        });
        
        var size = 1.3;
        var altitude = this._bottomAltitude;
        _.each(config.points, function(point) {
            self._pointNodes.push(new GlobeMain.PointNode({
                globeView: self,
                globe: self.globe,
                lat: point.lat,
                lng: point.lng,
                size: size,
                altitude: altitude,
                color: '#fff',
                opacity: 1
            }));
        });

        var lineConfig = {
            globe: this.globe,
            start: {
                altitude: this._bottomAltitude,
                color: GlobeMain.blue
            },
            end: {
                altitude: this._bottomAltitude,
                color: GlobeMain.blue
            }
        };
        
        _.each(config.lines, function(v, i) {
            lineConfig.start.point = v.start;
            lineConfig.end.point = v.end;
            self._addLine(lineConfig);
        });

        var raycaster = new THREE.Raycaster();
        var mouse = new THREE.Vector2();

        GlobeMain.on('mousedown', this.$el, function() {
            self.deselectCity();
        }, 'GlobeView');

        GlobeMain.on('click', this.$el, function(event) {
            var x = event.clientX / GlobeMain.scale;
            var y = event.clientY / GlobeMain.scale;
            var width = self.$el.width();
            var height = self.$el.height();
            mouse.x = (x / width) * 2 - 1;
            mouse.y = - (y / height) * 2 + 1;

            raycaster.setFromCamera( mouse, self.globe.camera );

            var earthDistance = Infinity;
            var intersects = raycaster.intersectObject(self.globe.earth);
            if (intersects.length) {
                earthDistance = intersects[0].distance;
            }

            mouse.x = x;
            mouse.y = y;
            var best;

            _.each(self._cityNodes, function(v, i) {
                if (!v.story || v.disabled()) {
                    return;
                }

                var pos = self._toScreenXY(v.node.position, self.globe.camera, self.$el);
                var screenDistance = mouse.distanceTo(pos);
                var worldDistance = v.node.position.distanceTo(self.globe.camera.position);
                if (screenDistance < 10 && worldDistance < earthDistance && (!best || best.screenDistance > screenDistance)) {
                    best = {
                        screenDistance: screenDistance,
                        cityNode: v,
                        worldDistance: worldDistance
                    };
                }
            });

            if (best) {
                self._onCityClick(best.cityNode);
            } else {
                self.deselectCity();
            }
        });

        this.globe.rawRender();
    };

    // ----------
    component.prototype = {
        // ----------
        start: function() {
            this.globe.animate();
        },

        // ----------
        selectCity: function(key, city) {
            this.deselectCity();

            var cityNode = _.find(this._cityNodes, function(v, i) {
                return v.story && v.story.key === key && v.city === city;
            });

            // Rotate the globe
            var twoPi = Math.PI * 2;
            var percent = new zot.range(-180, 180).proportion(cityNode.lng);
            var x = new zot.range(Math.PI * 0.5, Math.PI * 2.5).scale(percent);
            if (x > twoPi) {
                x -= twoPi;
            }

            // no doubt there is a slicker way to do this, but this works
            var oldTarget = this.globe.rotationTarget();
            var rotations = Math.floor(oldTarget.x / twoPi);
            var best, v;
            for (var i = rotations - 1; i < rotations + 2; i++) {
                v = x + (i * twoPi);
                distance = Math.abs(oldTarget.x - v);
                if (!best || best.distance > distance) {
                    best = {
                        x: v,
                        distance: distance
                    };
                }
            }

            percent = new zot.range(-90, 90).proportion(cityNode.lat);
            var y = new zot.range(Math.PI * -0.5, Math.PI * 0.5).scale(percent);

            this.globe.rotationTarget(best.x, y);

            // Highlight the node
            cityNode.select();

            // Announce
            this._selectedCityNode = cityNode;
        },

        // ----------
        deselectCity: function(options) {
            var self = this;

            options = options || {};

            if (!this._selectedCityNode) {
                return;
            }

            if (options.viewed) {
                _.each(this._cityNodes, function(v, i) {
                    if (v.story === self._selectedCityNode.story) {
                        v.viewed(true);
                    }
                });
            }

            this._selectedCityNode.deselect();
            this._selectedCityNode = null;

            if (!options.silent) {
                this._onDeselectCity();
            }
        },

        // ----------
        _toScreenXY: function ( position, camera, jqdiv ) {
            var pos = position.clone();
            var projScreenMat = new THREE.Matrix4();
            projScreenMat.multiplyMatrices( camera.projectionMatrix, camera.matrixWorldInverse );
            pos.GlobeMainlyProjection(projScreenMat);

            return new THREE.Vector2( ( pos.x + 1 ) * jqdiv.width() / 2 + jqdiv.offset().left,
                        ( - pos.y + 1) * jqdiv.height() / 2 + jqdiv.offset().top );
        },

        // ----------
        _addLine: function(config) {
            this._lines.push(new GlobeMain.Line(config));
        },

        // ----------
        animateLinesOn: function() {
            var self = this;

            _.each(this._lines, function(v, i) {
                setTimeout(function() {
                    var animate = function() {
                        if (self.stoppingLines) {
                            self._checkLinesStopping();
                            return;
                        }

                        v.animateOn();
                    };

                    animate();
                }, i * 50);
            });
        },

        // ----------
        animateLinesOff: function(complete) {
            this.stoppingLines = {
                complete: complete
            };

            this._checkLinesStopping();
        },

        // ----------
        _checkLinesStopping: function() {
            if (!this.stoppingLines) {
                return;
            }

            var animating = _.any(this._lines, function(v, i) {
                return v.animating;
            });

            if (!animating) {
                var complete = this.stoppingLines.complete;
                this.stoppingLines = null;
                if (complete) {
                    complete();
                }
            }
        }
    };

})();
