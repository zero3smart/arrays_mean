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

	 function toggleDisplayValForArr(arr) {
	 	for (var i = 0; i < arr.length; i++) {
	 		arr[i].nextElementSibling.style.display = 'block';
	 	}
	 }

	 // grab all h2 secondary column items, assign gallery title truncation height
	 var galleryTitleThreshold, secondaryColumns, galleryTitles;

	 secondaryColumns = document.querySelectorAll('.gallery-secondary-column-item h2');
	 galleryTitleThreshold = secondaryColumns ? 44 : 66;

	 galleryTitles = document.querySelectorAll('.gallery-title');

	 // convert to array
	 var secondaryColumnsArr, galleryTitlesArr; 

	 secondaryColumnsArr = Array.prototype.slice.call(secondaryColumns);
	 galleryTitlesArr = Array.prototype.slice.call(galleryTitles);

	 // filter out elements below height threshold
	 var overflowColumns, overflowGalleryTitles;

	 overflowColumns = secondaryColumnsArr.filter(function(el) {
	 	return el.offsetHeight > 136;
	 });

	 overflowGalleryTitles = galleryTitlesArr.filter(function(el) {
	 	return el.offsetHeight > galleryTitleThreshold;
	 })

	 toggleDisplayValForArr(overflowColumns);
	 toggleDisplayValForArr(overflowGalleryTitles);

});