var url = require('url');

module.exports = function(context) {
    var app = context.app;
    app.get('/s/:shared_page_id', function(req, res)
    {
        var shared_page_id = req.params.shared_page_id;
        if (shared_page_id == null || typeof shared_page_id === 'undefined' || shared_page_id == "") {
            res.status(403).send("Bad Request - shared_page_id missing")

            return;
        }
        context.shared_pages_controller.FindOneWithId(shared_page_id, function(err, doc)
        {
            if (err) {
                res.status(500).send("Internal Server Error");

                return;
            }
            if (doc == null) {
                res.status(404).send(err.response || 'Not Found');

                return;
            }
            var source_key = doc.sourceKey;
            if (source_key == null || typeof source_key === 'undefined' || source_key == "") {
                res.status(500).send("Internal Server Error");

                return;
            }
            var pageType = doc.pageType;
            if (pageType == "array_view") {
                var viewType = doc.viewType;
                var query = doc.query || {};

                var viewTypes = ['gallery', 'chart', 'line-graph', 'scatterplot', 'choropleth', 'timeline', 'word-cloud'];
                if (viewTypes.indexOf(viewType) !== -1) {
                    query.source_key = source_key;
                    context.API_data_preparation_controller.BindDataFor_array(query, viewType, function(err, bindData)
                    {
                        if (err) {
                            winston.error("❌  Error getting bind data for Array gallery: ", err);
                            res.status(500).send(err.response || 'Internal Server Error');

                            return;
                        }
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

                context.API_data_preparation_controller.BindDataFor_array_objectDetails(source_key, rowObjectId, function(err, bindData)
                {
                    if (err) {
                        winston.error("❌  Error getting bind data for Array source_key " + source_key + " object " + object_id + " details: ", err);
                        res.status(500).send(err.response || 'Internal Server Error');

                        return;
                    }
                    if (bindData == null) { // 404
                        res.status(404).send(err.response || 'Not Found');

                        return;
                    }
                    bindData.referer = req.headers.referer;
                    res.render('object/show', bindData);
                });

            } else {
                res.status(500).send("Internal Server Error");
            }
        });
    });
}