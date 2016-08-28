module.exports = function(context) {
    var app = context.app;
    app.get('/_ah/health', function(req, res)
    {
        res.set('Content-Type', 'text/plain');
        res.status(200).send('ok');
    });
}