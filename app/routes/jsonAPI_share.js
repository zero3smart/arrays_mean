var express = require('express');
var router = express.Router();
var url = require('url');
var winston = require('winston');
var shared_pages_model = require('../models/shared_pages');

router.post('/share', function (req, res) {
    var urlContainingShareParams = req.body.url;
    if (!urlContainingShareParams) {
        res.status(400).send("url parameter required");

        return;
    }
    var url_parts = url.parse(urlContainingShareParams, true);
    var pathname = url_parts.pathname;
    var query = url_parts.query;
    //
    var pageType;
    var viewType_orNull = null;
    var source_key; // the array's pKey
    var rowObjectId_orNull = null;

    function _stringFromPathNameWithRegEx(matcherRegEx) {
        var matches = matcherRegEx.exec(pathname);
        if (matches.length <= 1) {
            return null;
        }

        return matches[1];
    }

    var urlRegEx = /^\/(.*)\/(gallery|pie-chart|map|timeline|word-cloud|scatterplot|line-graph|pie-set|bar-chart)/g;

    if (/^\/(.*)\/(gallery|pie-chart|map|timeline|word-cloud|scatterplot|line-graph|pie-set|bar-chart)/g.test(pathname) == true) {
        pageType = "array_view";
        //
        if (/^\/.*\/gallery/g.test(pathname) == true) {
            viewType_orNull = 'gallery';
        } else if (/^\/.*\/pie-chart/g.test(pathname) == true) {
            viewType_orNull = "pie-chart";
        } else if (/^\/.*\/map/g.test(pathname) == true) {
            viewType_orNull = "map";
        } else if (/^\/.*\/timeline/g.test(pathname) == true) {
            viewType_orNull = "timeline";
        } else if (/^\/.*\/word-cloud/g.test(pathname) == true) {
            viewType_orNull = "word-cloud";
        } else if (/^\/.*\/scatterplot/g.test(pathname) == true) {
            viewType_orNull = "scatterplot";
        } else if (/^\/.*\/line-graph/g.test(pathname) == true) {
            viewType_orNull = "line-graph";
        } else if (/^\/.*\/pie-set/g.test(pathname) == true) {
            viewType_orNull = "pie-set";
        } else if (/^\/.*\/bar-chart/g.test(pathname) == true) {
            viewType_orNull = "bar-chart";
        }
        //
        source_key = _stringFromPathNameWithRegEx(urlRegEx);
    } else if (/^\/.*\/.*/g.test(pathname) == true) {
        pageType = "object_details";
        //
        source_key = _stringFromPathNameWithRegEx(/^\/(.*)\/.*/g);
        //
        rowObjectId_orNull = _stringFromPathNameWithRegEx(/^\/.*\/(.*)/g);
    } else if (/^\/s\/.*/g.test(pathname) == true) { // special case
        // Trying to share an already shared page - just use the same URL
        var alreadySharedPageId = _stringFromPathNameWithRegEx(/^\/s\/(.*)/g);
        _fabricateAndReplyWithShareURLWithSharedPageId(alreadySharedPageId);

        return;
    } else {
        res.status(403).send("Unable to share that URL");

        return;
    }
    if (source_key == null) {
        res.status(403).send("Unable to extract or locate Array source key in order to share that URL");

        return;
    }
    source_key = decodeURIComponent(source_key);
    //
    var persistableObjectTemplate = shared_pages_model.New_templateForPersistableObject(pageType, viewType_orNull, source_key, rowObjectId_orNull, query);
    shared_pages_model.InsertOneWithPersistableObjectTemplate(persistableObjectTemplate, function (err, sharedPageDoc) {
        if (err) {
            res.status(500).send("Internal Server Error");

            return;
        }
        var id = sharedPageDoc._id;
        _fabricateAndReplyWithShareURLWithSharedPageId(id);
    });
    function _fabricateAndReplyWithShareURLWithSharedPageId(id) {
        var protocol = req.header('x-forwarded-proto') == 'https' ? 'https' : 'http';
        var fabricatedShareURL = protocol + '://' + req.get('host') + "/s/" + id;
        _replyWithShareURL(fabricatedShareURL);
    }

    function _replyWithShareURL(share_url) {
        res.json({share_url: share_url});
    }
});

module.exports = router;