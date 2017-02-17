(function() {

    // ----------
    var component = GlobeMain.GlobeView = function(config) {
        var self = this;

        this._onNodeClick = config.onNodeClick;
        this._onMouseDown = config.onMouseDown;
        this._onDrag = config.onDrag;
        this._onMouseUp = config.onMouseUp;

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
                self._drag = {
                    lastX: event.clientX,
                    lastY: event.clientY,
                    distance: 0,
                    startTime: Date.now()
                };
                
                return self._onMouseDown ? self._onMouseDown(event) : false;
            },
            onDrag: function(event) {
                if (self._drag) {
                    var diffX = Math.abs(event.clientX - self._drag.lastX);
                    var diffY = Math.abs(event.clientY - self._drag.lastY);
                    self._drag.distance += diffX + diffY;
                    self._drag.lastX = event.clientX;
                    self._drag.lastY = event.clientY;
                }
                
                if (self._onDrag) {
                    self._onDrag(event);
                }
            },
            onMouseUp: function(event) {
                if (self._drag && self._drag.distance < 10 && Date.now() - self._drag.startTime < 500) {
                    var pointNode = self._hitTest(event);
                    if (pointNode) {
                        self._onNodeClick(pointNode);
                    }                    
                }
                
                self._drag = null;

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
            arcAltitude: 30,
            opacity: 0.5,
            width: 1,
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

        this._raycaster = new THREE.Raycaster();
        this._mouse = new THREE.Vector2();

        this.globe.rawRender();
    };

    // ----------
    component.prototype = {
        // ----------
        start: function() {
            this.globe.animate();
        },
        
        // ----------
        zoomIn: function() {
            var distance = this.globe.distance() * 0.99;
            this.globe.distance(Math.max(distance, 400));
        },

        // ----------
        zoomOut: function() {
            var distance = this.globe.distance() * 1.01;
            this.globe.distance(Math.min(distance, 5000));
        },
        
        // ----------
        _hitTest: function(event) {
            var self = this;
            var offset = this.$el.offset();
            var x = event.clientX / GlobeMain.scale;
            var y = event.clientY / GlobeMain.scale;
            var width = this.$el.width();
            var height = this.$el.height();
            this._mouse.x = ((x - offset.left) / width) * 2 - 1;
            this._mouse.y = - ((y - offset.top) / height) * 2 + 1;

            this._raycaster.setFromCamera( this._mouse, this.globe.camera );

            var earthDistance = Infinity;
            var intersects = this._raycaster.intersectObject(this.globe.earth);
            if (intersects.length) {
                earthDistance = intersects[0].distance;
            }

            this._mouse.x = x;
            this._mouse.y = y;
            var best;

            _.each(this._pointNodes, function(v, i) {
                if (v.disabled()) {
                    return;
                }

                var pos = self._toScreenXY(v.node.position, self.globe.camera, self.$el);
                var screenDistance = self._mouse.distanceTo(pos);
                var worldDistance = v.node.position.distanceTo(self.globe.camera.position);
                if (screenDistance < 30 && worldDistance < earthDistance && (!best || best.screenDistance > screenDistance)) {
                    best = {
                        screenDistance: screenDistance,
                        pointNode: v,
                        worldDistance: worldDistance
                    };
                }
            });

            if (best) {
                return best.pointNode;
            }
            
            return null;
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
        }
    };

})();
