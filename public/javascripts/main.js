$(window).load(function () {

    trackEvent("page load");

    trackEvent('page viewed', {
        'page name': document.title,
        'url': window.location.pathname
    });

    /**
     * Add class to body to prevent weird page width transitions
     */
    $('body').addClass('app-ready');
});

$(document).ready(function () {
    /**
     * Select source dataset on click
     */
    $('.js-panel-array').on('click', function (e) {
        e.preventDefault();
        var $parent = $(this).parent();
       
        var default_view = $parent.find("[name='default_view']").val();
        if (default_view === undefined || default_view == 'undefined' || default_view == '') {
            default_view = 'gallery';
        }

        var default_filterJSON = $parent.find("[name='default_filterJSON']").val();

        var sourceKey = $parent.find("[name='source_key']").val();


        //toDo: get view from api
        
        var viewTypes = ['gallery', 'chart', 'line-graph', 'scatterplot', 'choropleth', 'timeline', 'word-cloud', 'bar-chart', 'pie-set'];

        var words = default_view.split(/(?=[A-Z])/);
        var default_view_url = words.map(function (word) {
            return word.toLowerCase();
        }).join('-');

         var href; 

        if (viewTypes.indexOf(default_view_url) < 0) { //custom view
            var team = $parent.find("[name='team']").val();

            href = '/' + team + '/' + sourceKey + '/' + default_view_url;

            window.location.href = href;


        } else {
            href = '/array/' + sourceKey + '/' + default_view_url;
            if (default_filterJSON !== '' && default_filterJSON !== null && typeof default_filterJSON !== 'undefined') {
                href += "?" + default_filterJSON;
            }
            window.location.href = href;
         }




    
    });

    /**
     * Select team on click
     */
    $('.js-panel-team').on('click', function (e) {
        e.preventDefault();
        var $parent = $(this).parent();
        var sourceKey = $parent.find("[name='team_key']").val();
        var href = '/team/' + sourceKey;
        window.location.href = href;
    });

    /**
     * Allow click on source dataset URL within the panel
     */
    $('.source-link').on('click', function (e) {
        e.stopPropagation();
    });

    /**
     * Show sidebar filter on header bar click
     */
    $('.sidebar-filter-slide-toggle').click(function (e) {
        e.preventDefault();
        $(this).parents('li').toggleClass('active');
        $('body').toggleClass('sidebar-filter-in');
    });

    /**
     * Stop sidebar child events from bubbling up and causing content width bug
     */
    $('.sidebar-filter-subgroup').on('transitionend webkitTransitionEnd oTransitionEnd MSTransitionEnd', function (e) {
        e.stopPropagation();
    });

    /**
     * Resize content width after sidebar slide out animation complete
     */
    $('.sidebar-filter').on('transitionend webkitTransitionEnd oTransitionEnd MSTransitionEnd', function (e) {
        console.log('slide out complete');
        $('body').toggleClass('sidebar-filter-complete');
        $('body').hide().show(0);
    });

    /**
     * Sidebar filter accordion using Bootstrap
     */
    $('.collapse-trigger').on('click', function (e) {
        e.preventDefault();
        $(this).parent('li').siblings().find('.collapse').collapse('hide');
        $(this).parent('li').find('.collapse').collapse('toggle');
    });

    /**
     * Search criteria click dropdown item to select
     */
    $('.search-dropdown-item a').on('click', function (e) {
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
    $('.search-toggle').on('click', function (e) {
        e.preventDefault();
        $(this).toggleClass('search-active');
        $('.mobile-search-popover').toggleClass('search-open');
    });

    /**
     * Popup modal on embed code click
     */
    $('.share-link').on('click', function (e) {
        e.preventDefault();
        _POST_toGetURLForSharingCurrentPage(function (err, share_url) {
            if (err) {
                console.log(err);
            } else {
                $('#modal')
                    .on('show.bs.modal', function (e) {
                        var $modalTitle = $(this).find('.modal-title');
                        var $modalBody = $(this).find('.modal-body');

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

                        var embedUrl = '<iframe src="' + share_url + '?embed=true" width="640" height="480" frameborder="0"></iframe>';

                        $modalBody.append('<h3>Embed URL</h3>');
                        $modalBody.append('<pre id="embed-url" class="border-color-brand"></pre>');

                        $modalBody.append('<h3><input type="checkbox" id="cbEmbed">  Show header and footer</h3>');
                        $('#embed-url').text(embedUrl);

                        $(this).find('#cbEmbed').change(function () {
                            embedUrl = '<iframe src="' + share_url;
                            if (!$(this).is(":checked")) embedUrl += '?embed=true';
                            embedUrl += '" width="640" height="480" frameborder="0"></iframe>';
                            $('#embed-url').text(embedUrl);
                        });
                        /**
                         * Initialize Sharrre buttons
                         */
                        $(this).find('#twitter').sharrre({
                            share: {
                                twitter: true,
                            },
                            template: '<a href="#" class="btn btn-social background-color-brand"><span class="icon-twitter" aria-hidden="true"></span>Twitter</a>',
                            enableHover: false,
                            buttons: {twitter: {via: 'arrays'}},
                            click: function (api, options) {
                                api.openPopup('twitter');
                            }
                        });

                        $(this).find('#facebook').sharrre({
                            share: {
                                facebook: true,
                            },
                            template: '<a href="#" class="btn btn-social background-color-brand"><span class="icon-facebook" aria-hidden="true"></span>Facebook</a>',
                            enableHover: false,
                            click: function (api, options) {
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
    $('.browser-back-on-click').on('click', function (e) {
        e.preventDefault();
        window.history.back();

        return false;
    });

    /**
     * Missing image fallback
     */
        // Small
    $('.gallery-image, .timeline-image').error(function () {
        $(this).attr('src', '/images/image-not-found-sm.png');
    });

    // Large
    $('.object-featured').error(function () {
        $(this).attr('src', '/images/image-not-found-lg.png');
    });

    /**
     * Array description expand/collapse text
     */
    $('.array-description-expand').on('click', function (e) {
        $('.array-description').css("display", "none");
        $('.array-description-full').css("display", "inline");
        $('.array-description-expand').css("display", "none");
        $('.array-description-collapse').css("display", "inline");
    });

    $('.array-description-collapse').on('click', function (e) {
        $('.array-description').css("display", "inline");
        $('.array-description-full').css("display", "none");
        $('.array-description-collapse').css("display", "none");
        $('.array-description-expand').css("display", "inline-block");
    });

    $('#login').on('click', function (e) {
        e.preventDefault();
        window.location.href = '/auth/login';
        
    });

    $('#revealPassword').change(function(e) {
        if($(this).is(":checked")) {
            $('#passwordInput').attr('type','text');
        } else {
            $('#passwordInput').attr('type','password');

        }
    })

    /**
     * Toggle legend
     */
    $('.legend-toggle').on('click', function(e) {
        e.preventDefault();
        $('body').toggleClass('legend-open');
    });

    /**
     * Close legend
     */
    $('.legend-close').on('click', function(e) {
        e.preventDefault();
        $('body').removeClass('legend-open');
    });

});




/**
 * Construct filter object
 * Analog of nunjucks filter constructedFilterObj() in app.js:63
 */
function constructedFilterObj(existing_filterObj, this_filterCol, this_filterVal, isThisAnActiveFilter) {
    var filterObj = {};
    var existing_filterCols = Object.keys(existing_filterObj);
    var existing_filterCols_length = existing_filterCols.length;
    var filterVals;
    for (var i = 0; i < existing_filterCols_length; i++) {
        var existing_filterCol = existing_filterCols[i];
        if (existing_filterCol == this_filterCol) {
            continue; // never push other active values of this is filter col is already active
            // which means we never allow more than one filter on the same column at present
        }
        var existing_filterVals = existing_filterObj[existing_filterCol];
        filterObj[existing_filterCol] = existing_filterVals; // as it's not set yet
    }
    //
    if (isThisAnActiveFilter === false) { // do not push if active, since we'd want the effect of unsetting it
        filterVals = filterObj[this_filterCol] || [];
        if (Array.isArray(this_filterVal) && filterVals.indexOf(this_filterVal) == -1) {
            filterVals.push(filterVal);
            filterObj[this_filterCol] = filterVals.length == 1 ? filterVals[0] : filterVals;
        } else {
            filterObj[this_filterCol] = this_filterVal;
        }
    }
    //
    return filterObj;
}

function convertQueryStringToObject(inputString) {
    if (inputString == '') return {};

    var obj = {};
    var arr = decodeURIComponent(inputString).split('&');

    for (var i = 0; i < arr.length; i++) {
        var bits = arr[i].split('=');
        var key = bits[0];
        var value = bits[1];
        try {
            value = JSON.parse(value);
        } catch (e) {
            value = bits[1];
        }
        if (!obj.hasOwnProperty(key)) {
            obj[key] = value;
        } else if (typeof obj[key] === 'string') {
            obj[key] = [obj[key]];
            obj[key].push(value);
        } else if (Array.isArray(obj[key])) {
            obj[key].push(value);
        }
    }

    return obj;
}

function _POST_toGetURLForSharingCurrentPage(callback) { // callback: (err:Error, share_url:String) -> Void
    var parameters = {
        url: window.location.href
    };

    $.post("/v1/share", parameters, function (data) {
        var share_url = data.share_url;
        var err = null;
        if (!share_url) {
            err = new Error('Missing share_url from response.');
        }
        callback(err, share_url);
    }, "json");
}

function trackEvent(eventName, eventPayload) {
    if (typeof eventPayload === 'undefined' || eventPayload === null) {
        eventPayload = {};
    }
    var basePayload = {source: "client"}; // this lets us identify the source vs the server
    eventPayload = $.extend(basePayload, eventPayload);
    mixpanel.track(eventName, eventPayload);
}