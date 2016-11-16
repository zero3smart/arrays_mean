var express = require('express');
var passport = require('passport');
var router = express.Router();


router.get('/signup',function(req,res) {
    res.render('auth/signup',{
        env: process.env
    });
})


router.get('/signup/*',function(req,res) {
    res.redirect('/auth/signup');
})

router.get('/google',passport.authenticate('google',{scope:['https://www.googleapis.com/auth/userinfo.profile',
    'https://www.googleapis.com/auth/userinfo.email']}),function(req,res) {

});




router.get('/login', function(req, res) {
    if (req.user) {
        res.redirect('/admin');
    } else {
        res.render('auth/login', {
            env: process.env
        });
    }
});

router.get('/logout', function (req, res) {
    req.logout();
    res.redirect('/');
});

router.get('/google/callback',passport.authenticate('google',{successRedirect:'/',failureRedirect:'/auth/login'}))

router.get('/callback', passport.authenticate('auth0', {failureRedirect: '/'}), function (req, res) {
    res.redirect(req.session.returnTo || '/admin');
});

module.exports = router;