$(document).ready(function() {
    console.log('app loaded');

    /**
     * Sidebar filter accordion using Bootstrap
     */
    $('.collapse-trigger').on('click', function(e) {
    	e.preventDefault();
    	$(this).parent('li').siblings().find('.collapse').collapse('hide');
    	$(this).parent('li').find('.collapse').collapse('toggle');
    });
    
});