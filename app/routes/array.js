var url = require('url');
var winston = require('winston');
var queryString = require('querystring');
var express = require('express');
var passport = require('passport');
var ensureLoggedIn = require('connect-ensure-login').ensureLoggedIn();
var router = express.Router();

router.get('/create', function (req, res) {
    // Temporarily redirect to array index
    res.redirect('/array');
});

var index_controller = require('../controllers/client/data_preparation');

router.get('/', function (req, res) {
    index_controller.BindData(req, function (err, bindData) {

        if (err) {
            winston.error("❌  Error getting bind data for Array index: ", err);
            res.status(500).send(err.response || 'Internal Server Error');

            return;
        }
        res.render('array/index', bindData);
    });
});

var gallery_controller = require('../controllers/client/data_preparation/gallery');
var chart_controller = require('../controllers/client/data_preparation/chart');
var line_graph_controller = require('../controllers/client/data_preparation/line_graph');
var scatterplot_controller = require('../controllers/client/data_preparation/scatterplot');
var choropleth_controller = require('../controllers/client/data_preparation/choropleth');
var timeline_controller = require('../controllers/client/data_preparation/timeline');
var word_cloud_controller = require('../controllers/client/data_preparation/word_cloud');
var bar_chart_controller = require('../controllers/client/data_preparation/bar_chart');
var pie_set_controller = require('../controllers/client/data_preparation/pie_set');

var controllers = {
    gallery: gallery_controller,
    chart: chart_controller,
    timeline: timeline_controller,
    choropleth: choropleth_controller,
    scatterplot: scatterplot_controller,
    line_graph: line_graph_controller,
    word_cloud: word_cloud_controller,
    bar_chart: bar_chart_controller,
    pie_set: pie_set_controller
};


//toDo: get view from api
var viewTypes = ['gallery', 'chart', 'line-graph', 'scatterplot', 'choropleth', 'timeline', 'word-cloud', 'bar-chart', 'pie-set'];

viewTypes.forEach(function (viewType) {
    router.get('/:source_key/' + viewType, function (req, res) {
        var source_key = req.params.source_key;
        if (source_key == null || typeof source_key === 'undefined' || source_key == "") {
            res.status(403).send("Bad Request - source_key missing")

            return;
        }

        var query = queryString.parse(req.url.replace(/^.*\?/, ''));
        query.source_key = source_key;
        var camelCaseViewType = viewType.replace('-', '_');


        controllers[camelCaseViewType].BindData(req, query, function (err, bindData) {

            if (err) {
                winston.error("❌  Error getting bind data for Array gallery: ", err);
                res.status(500).send(err.response || 'Internal Server Error');

                return;
            }
            bindData.embedded = req.query.embed;
            res.render('array/' + viewType, bindData);
        });
    });
});

var object_details_controller = require('../controllers/client/data_preparation/object_details');

router.get('/:source_key/:object_id', function (req, res) {
    var source_key = req.params.source_key;
    if (source_key == null || typeof source_key === 'undefined' || source_key == "") {
        res.status(403).send("Bad Request - source_key missing")

        return;
    }
    var object_id = req.params.object_id;
    if (object_id == null || typeof object_id === 'undefined' || object_id == "") {
        res.status(403).send("Bad Request - object_id missing")

        return;
    }

    object_details_controller.BindData(req, source_key, object_id, function (err, bindData) {

        if (err) {
            winston.error("❌  Error getting bind data for Array source_key " + source_key + " object " + object_id + " details: ", err);
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
});

module.exports = router;