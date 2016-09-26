var passport = require('passport');

module.exports = function(context) {
    var app = context.app;
    app.get('/auth/login', function(req, res)
    {
        res.render('auth/login', { env: process.env });
    });

    app.get('/auth/logout', function(req, res)
    {
        req.logout();
        res.redirect('/');
    });

    app.get('/auth/callback', passport.authenticate('auth0', { failureRedirect: '/' }), function(req, res)
    {
        res.redirect(req.session.returnTo || '/array');
    });
}