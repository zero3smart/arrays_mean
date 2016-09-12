var url = require('url');
var winston = require('winston');
var ensureLoggedIn = require('connect-ensure-login').ensureLoggedIn();
var queryString = require('querystring');

module.exports = function(context) {
    var app = context.app;

    app.get('/array/create', function(req, res)
    {
        // Temporarily redirect to array index
        res.redirect('/array');
    });

    app.get('/array', function(req, res)
    {
        context.data_preparation_index_controller.BindDataFor_array_index(function(err, bindData)
        {
            if (err) {
                winston.error("❌  Error getting bind data for Array index: ", err);
                res.status(500).send(err.response || 'Internal Server Error');

                return;
            }
            res.render('array/index', bindData);
        });
    });

    var viewTypes = ['gallery', 'chart', 'line-graph', 'scatterplot', 'choropleth', 'timeline', 'word-cloud'];

    viewTypes.forEach(function(viewType) {
        app.get('/array/:source_key/' + viewType, function(req, res)
        {
            var source_key = req.params.source_key;
            if (source_key == null || typeof source_key === 'undefined' || source_key == "") {
                res.status(403).send("Bad Request - source_key missing")

                return;
            }

            var query = queryString.parse(req.url.replace(/^.*\?/, ''));
            query.source_key = source_key;
            console.log('-------- %j', query);
            var camelCaseViewType = viewType.replace( /-([a-z])/ig, function( all, letter ) {
                return letter.toUpperCase();
            });
            context['array_' + camelCaseViewType + '_controller'].BindDataFor_array(query, function(err, bindData)
            {
                if (err) {
                    winston.error("❌  Error getting bind data for Array gallery: ", err);
                    res.status(500).send(err.response || 'Internal Server Error');

                    return;
                }
                res.render('array/' + viewType, bindData);
            });
        });
    });
};