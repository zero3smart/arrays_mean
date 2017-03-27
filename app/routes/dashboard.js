var User = require('../models/users');

var express = require('express');
var passport = require('passport');
var router = express.Router();

router.get('/login', function(req, res) {
    if (req.user) {
        res.redirect('/dashboard');
    } else {
        res.render('auth/login', {
            env: process.env,
            user: req.user
        });
    }
});

router.get('/logout', function(req, res) {
    req.logout();
    res.redirect('/');
});


router.get('/*', function(req, res) {

    User.findById(req.user)
        .populate('_team')
        .lean()
        .exec(function(err, user) {
            if (err) {
                res.send(err);
            } else {
                if (!user) res.redirect('/auth/login');
                user.team = user._team;
                
                res.render('dashboard/index', {
                    env: process.env,
                    user: req.user
                });
            }
        });
});

module.exports = router;
