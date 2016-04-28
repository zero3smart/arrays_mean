$(function() {
	console.log('gallery loaded');

	/**
	 * Initialize controller
	 */
	var controller = new ScrollMagic.Controller();

	/**
	 * Set array header pin
	 */
	var scene = new ScrollMagic.Scene({
			offset: - $('.navbar-fixed-top').innerHeight(),
			triggerElement: '#array-controls'
		})
		.triggerHook('onLeave')
		.setPin('#array-controls')
		.addTo(controller);
});