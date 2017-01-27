$(function () {
    /**
     * Initialize controller
     */
    var controller = new ScrollMagic.Controller();

    console.log('here');
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

	 // grab all h2 secondary column items
	 var secondaryColumns = document.querySelectorAll('.gallery-secondary-column-item h2');
	 // convert to array
	 var secondaryColumnsArr = Array.prototype.slice.call(secondaryColumns);
	 // filter out elements below height threshold
	 var overflowColumns = secondaryColumnsArr.filter(function(el) {
	 	return el.offsetHeight > 136;
	 });

	 // apply style: item container background color -> overlay gradient background
	 for (var i = 0; i < overflowColumns.length; i++) {
	 	var backgroundColor = overflowColumns[i].parentNode.parentNode.parentNode.style.backgroundColor;
	 	var overlay = overflowColumns[i].nextElementSibling;
	 	overlay.style.background = 'linear-gradient(transparent 105px, ' + backgroundColor + ')';
	 	overlay.style.display = 'block';
	 }
});