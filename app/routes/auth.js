var passport = require('passport');
var express = require('express');
var router = express.Router();

router.get('/auth/login', function (req, res) {
    res.render('auth/login', {env: process.env});
});

router.get('/auth/logout', function (req, res) {
    req.logout();
    res.redirect('/');
});

router.get('/auth/callback', passport.authenticate('auth0', {failureRedirect: '/'}), function (req, res) {
    res.redirect(req.session.returnTo || '/array');
});

module.exports = router;