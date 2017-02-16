/**
 * dat.globe Javascript WebGL Globe Toolkit
 * http://dataarts.github.com/dat.globe
 *
 * Copyright 2011 Data Arts Team, Google Creative Lab
 *
 * Licensed under the Apache License, Version 2.0 (the 'License');
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 */

var DAT = DAT || {};

DAT.Globe = function(container, opts) {
    var self = this;

    opts = opts || {};

    var colorFn = opts.colorFn || function(x) {
        var c = new THREE.Color();
        c.setHSL( ( 0.6 - ( x * 0.5 ) ), 1.0, 0.5 );
        return c;
    };
    var imgDir = opts.imgDir || '/globe/';

    var Shaders = opts.shaders;

    this.onBeforeRender = opts.onBeforeRender;

    var camera, scene, renderer, w, h;
    var mesh, atmosphere, point;

    var mouse = { x: 0, y: 0 }, mouseOnDown = { x: 0, y: 0 };
    var target = { x: Math.PI * 1.9 / 2, y: Math.PI / 6.0 },
        targetOnDown = { x: 0, y: 0 };

    var rotation = _.clone(target);
    var distance = 1000;
    var distanceTarget = 1000;
    var distanceTargetFactor = 0.05;
    var secondaryDistanceTargetFactor = 0.5;
    var rotationTargetFactor = 0.02;
    var secondaryRotationTargetFactor = 0.1;
    var padding = 40;
    var PI_HALF = Math.PI / 2;
    var earth;
    var disableRotate;
    var initialAnimation = true;

    function init() {

        container.style.color = '#fff';
        container.style.font = '13px/20px Arial, sans-serif';

        var shader, uniforms, material;
        w = container.offsetWidth || window.innerWidth;
        h = container.offsetHeight || window.innerHeight;

        camera = new THREE.PerspectiveCamera(30, w / h, 1, 10000);
        camera.position.z = distance;

        scene = new THREE.Scene();

        var geometry = new THREE.SphereGeometry(200, 60, 60);
        var texture = THREE.ImageUtils.loadTexture(imgDir+'world-mask.jpg');

        // back
        shader = Shaders.earthBack;
        uniforms = THREE.UniformsUtils.clone(shader.uniforms);
        uniforms.texture.value = texture;
        material = new THREE.ShaderMaterial({
            uniforms: uniforms,
            vertexShader: shader.vertexShader,
            fragmentShader: shader.fragmentShader,
            transparent: true,
            side: THREE.BackSide
        });

        mesh = new THREE.Mesh(geometry, material);
        mesh.rotation.y = Math.PI;
        scene.add(mesh);

        // Front
        shader = Shaders.earthFront;
        uniforms = THREE.UniformsUtils.clone(shader.uniforms);
        uniforms.texture.value = texture;
        material = new THREE.ShaderMaterial({
            uniforms: uniforms,
            vertexShader: shader.vertexShader,
            fragmentShader: shader.fragmentShader,
            transparent: true,
            side: THREE.FrontSide
        });

        earth = mesh = new THREE.Mesh(geometry, material);
        mesh.rotation.y = Math.PI;
        scene.add(mesh);

        // Atmosphere
        // shader = Shaders.atmosphere;
        // uniforms = THREE.UniformsUtils.clone(shader.uniforms);
        // material = new THREE.ShaderMaterial({
        //     uniforms: uniforms,
        //     attributes: shader.attributes,
        //     vertexShader: shader.vertexShader,
        //     fragmentShader: shader.fragmentShader,
        //     side: THREE.BackSide,
        //     blending: THREE.MultiplyBlending,
        //     transparent: true
        // });
        //
        // self.atmosphere = mesh = new THREE.Mesh(geometry, material);
        // mesh.scale.set( 1.5, 1.5, 1.5 );
        //
        // var verts = mesh.geometry.vertices;
        // var values = shader.attributes.displacement.value;
        // for (var i = 0; i < verts.length; i++) {
        //     values.push(1 + (Math.random() * 30));
        // }
        //
        // scene.add(mesh);
        // // shader.attributes.displacement.needsUpdate = true;
        // // console.log(verts.length, geometry.vertices.length, values.length, shader);

        geometry = new THREE.BoxGeometry(0.75, 0.75, 1);
        geometry.applyMatrix(new THREE.Matrix4().makeTranslation(0,0,-0.5));

        point = new THREE.Mesh(geometry);

        renderer = new THREE.WebGLRenderer({antialias: true});
        renderer.setClearColor(new THREE.Color(0xfafafa), 1);
        renderer.setSize(w, h);

        renderer.domElement.style.position = 'absolute';

        container.appendChild(renderer.domElement);

        GlobeMain.on('mousedown', $(container), onMouseDown, 'Globe');
    }

    function onMouseDown(event) {
        event.preventDefault();

        GlobeMain.on('mousemove', $(container), onMouseMove, 'Globe');
        GlobeMain.on('mouseup', $(container), onMouseUp, 'Globe');
        container.addEventListener('mouseout', onMouseOut, false);

        mouseOnDown.x = - event.clientX;
        mouseOnDown.y = event.clientY;

        targetOnDown.x = target.x;
        targetOnDown.y = target.y;

        container.style.cursor = 'move';

        disableRotate = opts.onMouseDown(event);
    }

    function onMouseMove(event) {
        if (!disableRotate) {
            if (initialAnimation) {
                targetOnDown.x = rotation.x;
                targetOnDown.y = rotation.y;
                rotationTargetFactor = secondaryRotationTargetFactor;
                initialAnimation = false;
            }

            mouse.x = - event.clientX;
            mouse.y = event.clientY;

            var zoomDamp = distance/1000;

            target.x = targetOnDown.x + (mouse.x - mouseOnDown.x) * 0.005 * zoomDamp;
            target.y = targetOnDown.y + (mouse.y - mouseOnDown.y) * 0.005 * zoomDamp;

            target.y = target.y > PI_HALF ? PI_HALF : target.y;
            target.y = target.y < - PI_HALF ? - PI_HALF : target.y;
        }

        opts.onDrag(event);
    }

    function onMouseUp(event) {
        GlobeMain.off('mousemove', $(container), onMouseMove);
        GlobeMain.off('mouseup', $(container), onMouseUp);
        container.removeEventListener('mouseout', onMouseOut, false);
        container.style.cursor = 'auto';

        opts.onMouseUp();
    }

    function onMouseOut(event) {
        GlobeMain.off('mousemove', $(container), onMouseMove);
        GlobeMain.off('mouseup', $(container), onMouseUp);
        container.removeEventListener('mouseout', onMouseOut, false);
    }

    function animate(time) {
        requestAnimationFrame(animate);
        render(time || 0);
    }

    function render(time) {
        rotation.x += (target.x - rotation.x) * rotationTargetFactor;
        rotation.y += (target.y - rotation.y) * rotationTargetFactor;
        distance += (distanceTarget - distance) * distanceTargetFactor;

        camera.position.x = distance * Math.sin(rotation.x) * Math.cos(rotation.y);
        camera.position.y = distance * Math.sin(rotation.y);
        camera.position.z = distance * Math.cos(rotation.x) * Math.cos(rotation.y);

        camera.lookAt(mesh.position);

        self.onBeforeRender(time);

        rawRender();
    }

    function rawRender() {
        renderer.render(scene, camera);
    }

    init();

    this.animate = animate;
    this.renderer = renderer;
    this.rawRender = rawRender;
    this.scene = scene;
    this.camera = camera;
    this.earth = earth;
    this.rotation = rotation;

    this.distance = function(value) {
        if (value === undefined) {
            return distanceTarget;
        }
        
        distanceTarget = value;
        distanceTargetFactor = secondaryDistanceTargetFactor;
    };

    this.rotationTarget = function(x, y) {
        if (x === undefined && y === undefined) {
            return target;
        }

        initialAnimation = false;
        rotationTargetFactor = secondaryRotationTargetFactor;
        target.x = x;
        target.y = y;
    };

    return this;

};
