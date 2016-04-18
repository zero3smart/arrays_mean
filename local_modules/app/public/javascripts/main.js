$(document).ready(function() {

    console.log('app loaded');

    /**
     * Select source dataset click
     */
    $('.panel-source').on('click', function(e) {
        e.preventDefault();
        var sourceKey = $(this).prev().val();
        window.location.href = '/array/' + sourceKey + '/gallery';
    });

    /**
     * Allow click on source dataset URL within the panel
     */
    $('.source-link').on('click', function(e) {
        e.stopPropagation();
    });

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

    /**
     * Search criteria dropdown
     */
    $('.search-control .dropdown-toggle').on('click', function(e) {

        e.preventDefault();
        e.stopPropagation();
        
        var $this = $(this);

        if ($this.is('.disabled, :disabled')) return;

        var $parent  = $this.parent('.dropdown');
        var isActive = $parent.hasClass('open');

        if (!isActive) {
            if ('ontouchstart' in document.documentElement && !$parent.closest('.navbar-nav').length) {
                // if mobile we use a backdrop because click events don't delegate
                $(document.createElement('div'))
                    .addClass('dropdown-backdrop')
                    .insertAfter($(this));
            }

            $this.trigger('focus').attr('aria-expanded', 'true');
            $parent.toggleClass('open');
        } else {
            $this.attr('aria-expanded', 'false');
            $parent.removeClass('open');
        }
    });

    /**
     * Search criteria click dropdown item to select
     */
    $('.search-dropdown-item a').on('click', function(e) {
        e.preventDefault();
        var colname = $(this).data('colname');

        $('.search-criteria').html(colname);
        $('.search-colname').attr('value', colname);

        $('.search-control .dropdown-toggle').attr('aria-expanded', 'false');
        $(this).closest('.dropdown').removeClass('open');
    });
    
    $('a.share-link').on('click', function(e) 
    {
        e.preventDefault();
        _POST_toGetURLForSharingCurrentPage(function(err, share_url)
        {
            if (err) {
                alert(err);
            } else {
                alert("Share url: " + share_url);
            }
        });
        
        return false;
    });
    $('a.get-embed-code-link').on('click', function(e) 
    {
        e.preventDefault();
        _POST_toGetURLForSharingCurrentPage(function(err, share_url)
        {
            if (err) {
                alert(err);
            } else {
                alert("Share url for embedding: " + share_url);
            }
        });
        
        return false;
    });
});

function _POST_toGetURLForSharingCurrentPage(callback)
{ // callback: (err:Error, share_url:String) -> Void
    var parameters = 
    { 
        url: window.location.href 
    };
    $.post("/v1/share", parameters, function(data) 
    {
        var share_url = data.share_url;
        var err = null;
        if (share_url == null || typeof share_url === 'undefined' || share_url == "") {
            err = new Error('Missing share_url from response.');
        }
        callback(err, share_url);
    }, "json");
}