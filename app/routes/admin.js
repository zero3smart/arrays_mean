var express = require('express');
var ensureLoggedIn = require('connect-ensure-login').ensureLoggedIn('/auth/login');
var passport = require('passport');
var router = express.Router();

router.get('/login', function(req, res) {

    if (req.user) {
        res.redirect('/admin');
    } else {
        res.render('auth/login', {
            env: process.env,
            user: req.user
        });
    }


});



router.get('/logout', function (req, res) {
    req.logout();
    res.redirect('/');
});

router.get('/callback', passport.authenticate('auth0', {failureRedirect: '/'}), function (req, res) {
    res.redirect(req.session.returnTo || '/admin');
});

router.get('/*',  function (req, res) {

    res.render('admin/index', {
        env: process.env,
        user: req.user
    });
});

module.exports = router;