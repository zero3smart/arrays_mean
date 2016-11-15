var url = require('url');
var winston = require('winston');
var express = require('express');
var router = express.Router();

var shared_pages_controller = require('../models/shared_pages');
var object_details_controller = require('../controllers/client/data_preparation/object_details');

var gallery_controller = require('../controllers/client/data_preparation/gallery');
var choropleth_controller = require('../controllers/client/data_preparation/choropleth');
var timeline_controller = require('../controllers/client/data_preparation/timeline');
var line_graph_controller = require('../controllers/client/data_preparation/line_graph');
var word_cloud_controller = require('../controllers/client/data_preparation/word_cloud');
var scatterplot_controller = require('../controllers/client/data_preparation/scatterplot');
var chart_controller = require('../controllers/client/data_preparation/chart');
var pie_set_controller = require('../controllers/client/data_preparation/pie_set');
var bar_chart_controller = require('../controllers/client/data_preparation/bar_chart');

var controllers = {
    object_details: object_details_controller,
    gallery: gallery_controller,
    chart: chart_controller,
    lineGraph: line_graph_controller,
    timeline: timeline_controller,
    wordCloud: word_cloud_controller,
    choropleth: choropleth_controller,
    scatterplot: scatterplot_controller,
    pieSet: pie_set_controller,
    barChart: bar_chart_controller
};

router.get('/:shared_page_id', function (req, res) {
    var shared_page_id = req.params.shared_page_id;
    if (!shared_page_id || shared_page_id == "") {
        res.status(403).send("Bad Request - shared_page_id missing")

        return;
    }
    shared_pages_controller.FindOneWithId(shared_page_id, function (err, doc) {
        if (err) {
            res.status(500).send(err.response);

            return;
        }

        if (!doc) {
            res.status(404).send('Not Found');

            return;
        }

        var source_key = doc.sourceKey;
        if (!source_key == null || source_key == "") {
            res.status(500).send("Internal Server Error");

            return;
        }
        var pageType = doc.pageType;
        if (pageType == "array_view") {
            var viewType = doc.viewType;
            var query = doc.query || {};

            var viewTypes = ['gallery', 'chart', 'line-graph', 'scatterplot', 'choropleth', 'timeline', 'word-cloud', 'pie-set', 'bar-chart'];
            if (viewTypes.indexOf(viewType) !== -1) {
                query.source_key = source_key;
                var camelCaseViewType = viewType.replace(/-([a-z])/ig, function (all, letter) {
                    return letter.toUpperCase();
                });

                controllers[camelCaseViewType].BindData(req, query, function (err, bindData) {
                    if (err) {
                        winston.error("❌  Error getting bind data for Array gallery: ", err);
                        res.status(500).send(err.response || 'Internal Server Error');

                        return;
                    }
                    bindData.embedded = req.query.embed;
                    res.render('array/' + viewType, bindData);
                });

            } else {
                res.status(500).send("Internal Server Error");
            }
        } else if (pageType == "object_details") {
            var rowObjectId = doc.rowObjectId;
            if (rowObjectId == null || typeof rowObjectId === 'undefined' || rowObjectId == "") {
                res.status(500).send("Internal Server Error");

                return;
            }

            object_details_controller.BindData(source_key, rowObjectId, function (err, bindData) {
                if (err) {
                    winston.error("❌  Error getting bind data for Array source_key " + source_key + " object " + rowObjectId + " details: ", err);
                    res.status(500).send(err.response || 'Internal Server Error');

                    return;
                }

                if (bindData == null) { // 404
                    res.status(404).send(err.response || 'Not Found');

                    return;
                }

                bindData.embedded = req.query.embed;
                bindData.referer = req.headers.referer;
                res.render('object/show', bindData);
            });

        } else {
            res.status(500).send("Internal Server Error");
        }
    });
});

module.exports = router;