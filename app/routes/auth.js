var passport = require('passport');
var express = require('express');
var router = express.Router();

router.get('/login', function (req, res) {
    res.render('auth/login', {env: process.env});
});

router.get('/logout', function (req, res) {
    req.logout();
    res.redirect('/');
});

router.get('/callback', passport.authenticate('auth0', {failureRedirect: '/'}), function (req, res) {
    res.redirect(req.session.returnTo || '/admin');
});

module.exports = router;