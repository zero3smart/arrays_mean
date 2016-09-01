module.exports = function(context) {
    var app = context.app;
    app.get('/test', function(req, res)
    {
        context.API_data_preparation_controller.BindDataFor_datasetsListing(function(err, bindData)
        {
            if (err) {
                winston.error("❌  Error getting bind data for Array create: ", err);
                res.status(500).send(err.response || 'Internal Server Error');

                return;
            }
            res.render('test/test', bindData);
        });
    });
}