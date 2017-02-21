/*
 * Define linechart common name space.
 */
var linechart = {};

$(function () {
    /**
     * Initialize controller
     */
    var controller = new ScrollMagic.Controller();

    /**
     * Set array header pin
     */

     if (window.location.href.indexOf('embed=true') > -1) {
         var scene = new ScrollMagic.Scene({
                offset: 0,
                triggerElement: '#array-controls'
            })
            .triggerHook('onLeave')
            .setPin('#array-controls')
            .setClassToggle('body', 'array-controls-pinned')
            .addTo(controller);
     }
     else {
         var scene = new ScrollMagic.Scene({
                offset: - $('.navbar-fixed-top').innerHeight(),
                triggerElement: '#array-controls'
            })
            .triggerHook('onLeave')
            .setPin('#array-controls')
            .setClassToggle('body', 'array-controls-pinned')
            .addTo(controller);
     }
});