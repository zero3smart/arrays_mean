$(document).ready(function() {

    console.log('app loaded');

    /**
     * Show sidebar filter on header bar click
     */
    $('.sidebar-filter-toggle').click(function(e) {
    	e.preventDefault();
    	$(this).parents('li').toggleClass('active');
    	$('body').toggleClass('sidebar-filter-in');
    });

    /**
     * Sidebar filter accordion using Bootstrap
     */
    $('.collapse-trigger').on('click', function(e) {
    	e.preventDefault();
    	$(this).parent('li').siblings().find('.collapse').collapse('hide');
    	$(this).parent('li').find('.collapse').collapse('toggle');
    });
    
});