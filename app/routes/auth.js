var passport = require('passport');
var express = require('express');
var router = express.Router();
var requireRole = require('../requireRole');

router.get('/login', function (req, res) {
    res.render('auth/login', {env: process.env});
});

router.get('/logout', function (req, res) {
    req.logout();
    res.redirect('/');
});

router.get('/auth/callback', passport.authenticate('auth0', {failureRedirect: '/auth/failure'}), function (req, res) {
    console.log(req.user.Profile._json);
    res.redirect(req.session.returnTo || '/array');
});

router.get('/admin', requireRole('admin'), function (req, res) {
    res.render('auth/admin');
});

router.get('/unauthorized', function(req, res) {
    res.render('auth/unauthorized', {env: env});
});


module.exports = router;