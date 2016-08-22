var passport = require('passport');

module.exports = function(context) {
    var env = {
        AUTH0_CLIENT_ID: process.env.AUTH0_CLIENT_ID,
        AUTH0_DOMAIN: process.env.AUTH0_DOMAIN,
        AUTH0_CALLBACK_URL: process.env.AUTH0_CALLBACK_URL || 'http://localhost:3000/callback'
    };

    var app = context.app;
    app.get('/login', function(req, res)
    {
        res.render('user/login', { env: env });
    });

    app.get('/logout', function(req, res)
    {
        req.logout();
        res.redirect('/');
    });

    app.get('/callback', passport.authenticate('auth0', { failureRedirect: '/' }), function(req, res)
    {
        res.redirect(req.session.returnTo || '/user/profile');
    });
}