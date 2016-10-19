$(function () {
    /**
     * Initialize controller
     */
    var controller = new ScrollMagic.Controller();

    /**
     * Set array header pin
     */
    var scene = new ScrollMagic.Scene({
        offset: 0,
        triggerElement: '#array-controls'
    })
        .triggerHook('onLeave')
        .setPin('#array-controls')
        .setClassToggle('body', 'array-controls-pinned')
        .addTo(controller);
});