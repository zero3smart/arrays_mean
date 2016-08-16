module.exports = function(context) {
    var app = context.app;
    app.get('/', function(req, res)
    {
        var bindData =
        {
            env: process.env
        };
        res.render('homepage/homepage', bindData);
    });
}