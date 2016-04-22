$(document).ready(function() {

    console.log('app loaded');

    /**
     * Select source dataset click
     */
    $('.panel-source').on('click', function(e) {
        e.preventDefault();
        var $parent = $(this).parent();
        var sourceKey = $parent.find("[name='source_key']").val();
        var default_filterCol = $parent.find("[name='default_filterCol']").val();
        var default_filterVal = $parent.find("[name='default_filterVal']").val();
        var href = '/array/' + sourceKey + '/gallery';
        if (default_filterCol != '' && default_filterCol != null && typeof default_filterCol !== 'undefined') {
            if (default_filterVal != '' && default_filterVal != null && typeof default_filterVal !== 'undefined') {
                href += "?filterCol=" + default_filterCol + "&filterVal=" + default_filterVal;
            }
        }
        window.location.href = href;
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
     * Resize content width after sidebar slide out animation complete
     */
    $('.sidebar-filter').on('transitionend webkitTransitionEnd oTransitionEnd MSTransitionEnd', function(e) {
        console.log('slide out complete');
        $('body').toggleClass('sidebar-filter-complete');
        $('body').hide().show(0);
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
     * Popup modal on embed code click
     */
    $('.share-link').on('click', function(e) 
    {
        e.preventDefault();
        _POST_toGetURLForSharingCurrentPage(function(err, share_url)
        {
            if (err) {
                console.log(err);
            } else {
                $('#modal')
                    .on('show.bs.modal', function (e) {
                        var $modalTitle  = $(this).find('.modal-title');
                        var $modalBody  = $(this).find('.modal-body');

                        $modalTitle.html('Share');
                        $modalBody.html('<h3>Share on Social Media</h3>');
                        $modalBody.append('<a href="#" id="twitter" class="btn btn-default" data-url="' + share_url + '" data-text="Arrays">Twitter</a>');
                        $modalBody.append('<div id="facebook" data-url="' + share_url + '" data-text="Arrays"></div>');
                        $modalBody.append('<h3>Share url for embedding:</h3>');
                        $modalBody.append('<pre>' + share_url + '</pre>');

                        /**
                         * Initialize Sharrre buttons
                         */
                        $(this).find('#twitter').sharrre({
                            share: {
                                twitter: true,
                            },
                            template: '<a href="#" class="btn btn-default">Twitter</a>',
                            enableHover: false,
                            buttons: { twitter: {via: 'arrays'}},
                            click: function(api, options){
                                api.openPopup('twitter');
                            }
                        });

                        $(this).find('#facebook').sharrre({
                            share: {
                                facebook: true,
                            },
                            template: '<a href="#" class="btn btn-default">Facebook</a>',
                            enableHover: false,
                            click: function(api, options){
                                api.openPopup('facebook');
                            }
                        });
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