$(window).load(function() {

    trackEvent("page load");
    
    /**
     * Add class to body to prevent weird page width transitions
     */
    $('body').addClass('app-ready');
});

$(document).ready(function() {

    console.log('app loaded');

    /**
     * Select source dataset click
     */
    $('.panel-source').on('click', function(e) {
        e.preventDefault();
        var $parent = $(this).parent();
        var sourceKey = $parent.find("[name='source_key']").val();
        var default_filterJSON = $parent.find("[name='default_filterJSON']").val();
        var href = '/array/' + sourceKey + '/gallery';
        if (default_filterJSON !== '' && default_filterJSON !== null && typeof default_filterJSON !== 'undefined') {
            href += "?filterJSON=" + default_filterJSON;
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
    $('.sidebar-filter-slide-toggle').click(function(e) {
        e.preventDefault();
        $(this).parents('li').toggleClass('active');
        $('body').toggleClass('sidebar-filter-in');
    });

    /**
     * Stop sidebar child events from bubbling up and causing content width bug
     */
    $('.sidebar-filter-subgroup').on('transitionend webkitTransitionEnd oTransitionEnd MSTransitionEnd', function(e) {
        e.stopPropagation();
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
     * Mobile search popover
     */
    $('.search-toggle').on('click', function(e) {
        e.preventDefault();
        $(this).toggleClass('search-active');
        $('.mobile-search-popover').toggleClass('search-open');
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

                        var $arrayTitle = $('.array-title');
                        var arrayTitle = '';
                        if ($arrayTitle.length) {
                            arrayTitle = $('.array-title').html();
                        }

                        $modalTitle.html('Share ' + arrayTitle);
                        $modalBody.html('<h3>Share on Social Media</h3>');
                        $modalBody.append('<div id="facebook" data-url="' + share_url + '" data-text="Arrays"></div>');
                        $modalBody.append('<a href="#" id="twitter" class="btn btn-social background-color-brand" data-url="' + share_url + '" data-text="Arrays"><span class="icon-twitter" aria-hidden="true"></span>Twitter</a>');
                        $modalBody.append('<h3>Share URL</h3>');
                        $modalBody.append('<pre class="border-color-brand">' + share_url + '</pre>');

                        /**
                         * Initialize Sharrre buttons
                         */
                        $(this).find('#twitter').sharrre({
                            share: {
                                twitter: true,
                            },
                            template: '<a href="#" class="btn btn-social background-color-brand"><span class="icon-twitter" aria-hidden="true"></span>Twitter</a>',
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
                            template: '<a href="#" class="btn btn-social background-color-brand"><span class="icon-facebook" aria-hidden="true"></span>Facebook</a>',
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
    
    /**
     * For back links with no referer, do a browser "back"
     */
    $('.browser-back-on-click').on('click', function(e) 
    {
        e.preventDefault();
        window.history.back();
        
        return false;
    });
});

/**
 * Construct filter object
 * Analog of nunjucks filter constructedFilterObj() in app.js:63
 */
function constructedFilterObj(existing_filterObj, this_filterCol, this_filterVal, isThisAnActiveFilter) {
    var filterObj = {};
    var existing_filterCols = Object.keys(existing_filterObj);
    for (var i = 0 ; i < existing_filterCols.length ; i++) {
        var existing_filterCol = existing_filterCols[i];
        if (existing_filterCol == this_filterCol) { 
            continue; // never push other active values of this is filter col is already active
            // which means we never allow more than one filter on the same column at present
        }
        var existing_filterVals = existing_filterObj[existing_filterCol];
        //
        var filterVals = [];
        //
        var existing_filterVals_length = existing_filterVals.length;
        for (var j = 0 ; j < existing_filterVals_length ; j++) {
            var existing_filterVal = existing_filterVals[j];
            var encoded_existing_filterVal = existing_filterVal;
            filterVals.push(encoded_existing_filterVal); 
        }
        //
        if (filterVals.length !== 0) {
            filterObj[existing_filterCol] = filterVals; // as it's not set yet
        }
    }
    //
    if (isThisAnActiveFilter === false) { // do not push if active, since we'd want the effect of unsetting it
        var filterVals = filterObj[this_filterCol] || [];
        if (filterVals.indexOf(this_filterVal) == -1) {
            var encoded_this_filterVal = this_filterVal;
            filterVals.push(encoded_this_filterVal);
        }
        filterObj[this_filterCol] = filterVals; // in case it's not set yet
    }
    //
    return filterObj;
}

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
        if (share_url === null || typeof share_url === 'undefined' || share_url === "") {
            err = new Error('Missing share_url from response.');
        }
        callback(err, share_url);
    }, "json");
}

function trackEvent(eventName, eventPayload)
{
    if (typeof eventPayload === 'undefined' || eventPayload === null) {
        eventPayload = {};
    }
    var basePayload = { source: "client" }; // this lets us identify the source vs the server
    eventPayload = $.extend(basePayload, eventPayload);
    mixpanel.track(eventName, eventPayload);
}
