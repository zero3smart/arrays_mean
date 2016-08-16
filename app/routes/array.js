var url = require('url');

module.exports = function(context) {
    var app = context.app;

    app.get('/array/create', function(req, res)
    {
        context.data_preparation_create_controller.BindDataFor_datasetsListing(function(err, bindData)
        {
            if (err) {
                winston.error("❌  Error getting bind data for Array create: ", err);
                res.status(500).send(err.response || 'Internal Server Error');

                return;
            }
            res.render('array/create', bindData);
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

            var url_parts = url.parse(req.url, true);
            var query = url_parts.query;

            query.source_key = source_key;
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