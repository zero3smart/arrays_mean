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

    /**
     * Share links
     */
    $('#facebook').on('click', function(e) {
        e.preventDefault();
        _POST_toGetURLForSharingCurrentPage(function(err, share_url)
        {
            if (err) {
                console.log(err);
            } else {
                // alert("Share url: " + share_url);
                $(this).sharrre({
                    share: {
                        facebook: true,
                    },
                    title: 'Arrays',
                    url: 'http://www.arrays.co',
                    enableTracking: false,
                    render: function(api, options) {
                        api.openPopup('facebook');
                    }
                });
            }
        });
        
        return false;
    });

    $('#twitter').on('click', function(e) {
        e.preventDefault();
        _POST_toGetURLForSharingCurrentPage(function(err, share_url)
        {
            if (err) {
                console.log(err);
            } else {
                // alert("Share url: " + share_url);
                $(this).sharrre({
                    share: {
                        twitter: true,
                    },
                    title: 'Arrays',
                    url: 'http://www.arrays.co',
                    enableTracking: false,
                    render: function(api, options) {
                        api.openPopup('twitter');
                    }
                });
            }
        });
        
        return false;
    });

    /**
     * Popup modal on embed code click
     */
    $('.get-embed-code-link').on('click', function(e) 
    {
        e.preventDefault();
        _POST_toGetURLForSharingCurrentPage(function(err, share_url)
        {
            if (err) {
                console.log(err);
            } else {
                $('#modal')
                    .on('show.bs.modal', function (e) {
                        var modal = $(this);
                        modal.find('.modal-title').html('Embed Code');
                        modal.find('.modal-body').html('<h3>Share url for embedding:</h3> <pre>' + share_url + '</pre>');
                    })
                    .modal();
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