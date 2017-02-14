(function() {

    // ----------
    var component = GlobeMain.GlobeView = function(config) {
        var self = this;

        this._onNodeClick = config.onNodeClick;
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
                    uLandColor: { type: 'c', value: new THREE.Color( config.landColor ) },
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
                    uLandColor: { type: 'c', value: new THREE.Color( config.landColor ) },
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
        
        var size = 3;
        var altitude = this._bottomAltitude;
        _.each(config.points, function(point) {
            self._pointNodes.push(new GlobeMain.PointNode({
                globeView: self,
                globe: self.globe,
                lat: point.lat,
                lng: point.lng,
                size: size,
                altitude: altitude,
                color: config.pointColor,
                opacity: 1
            }));
        });

        var lineConfig = {
            globe: this.globe,
            start: {
                altitude: this._bottomAltitude,
                color: config.lineColor
            },
            end: {
                altitude: this._bottomAltitude,
                color: config.lineColor
            }
        };
        
        _.each(config.lines, function(v, i) {
            lineConfig.start.point = v.start;
            lineConfig.end.point = v.end;
            self._addLine(lineConfig);
        });

        var raycaster = new THREE.Raycaster();
        var mouse = new THREE.Vector2();

        GlobeMain.on('click', this.$el, function(event) {
            var offset = self.$el.offset();
            var x = event.clientX / GlobeMain.scale;
            var y = event.clientY / GlobeMain.scale;
            var width = self.$el.width();
            var height = self.$el.height();
            mouse.x = ((x - offset.left) / width) * 2 - 1;
            mouse.y = - ((y - offset.top) / height) * 2 + 1;

            raycaster.setFromCamera( mouse, self.globe.camera );

            var earthDistance = Infinity;
            var intersects = raycaster.intersectObject(self.globe.earth);
            if (intersects.length) {
                earthDistance = intersects[0].distance;
            }

            mouse.x = x;
            mouse.y = y;
            var best;

            _.each(self._pointNodes, function(v, i) {
                if (v.disabled()) {
                    return;
                }

                var pos = self._toScreenXY(v.node.position, self.globe.camera, self.$el);
                var screenDistance = mouse.distanceTo(pos);
                var worldDistance = v.node.position.distanceTo(self.globe.camera.position);
                if (screenDistance < 10 && worldDistance < earthDistance && (!best || best.screenDistance > screenDistance)) {
                    best = {
                        screenDistance: screenDistance,
                        pointNode: v,
                        worldDistance: worldDistance
                    };
                }
            });

            if (best) {
                self._onNodeClick(best.pointNode);
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
        _toScreenXY: function ( position, camera, jqdiv ) {
            var pos = position.clone();
            var projScreenMat = new THREE.Matrix4();
            projScreenMat.multiplyMatrices( camera.projectionMatrix, camera.matrixWorldInverse );
            pos.applyProjection(projScreenMat);

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
