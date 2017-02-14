var express = require('express');
var passport = require('passport');
var router = express.Router();
var jwt = require('jsonwebtoken');
var User = require('../models/users');
var Team = require('../models/teams');

router.get('/google', passport.authenticate('google', {
    scope: ['https://www.googleapis.com/auth/userinfo.profile',
        'https://www.googleapis.com/auth/userinfo.email']
}));

var Recurly = require('node-recurly');
var recurlyConfig = {
    API_KEY: process.env.RECURLY_API_KEY ? process.env.RECURLY_API_KEY : null,
    SUBDOMAIN: process.env.RECURLY_SUBDOMAIN ? process.env.RECURLY_SUBDOMAIN : 'schema',
    DEBUG: process.env.RECURLY_DEBUG ? process.env.RECURLY_DEBUG : false
};
var recurly = new Recurly(recurlyConfig);


var updateSubscriptionInfo = function(user, callback) {

    //Check subscription in Recurly
    recurly.subscriptions.listByAccount(user.defaultLoginTeam.toString(), {}, function(err, response) {

        var subscription = { data: { subscription: false } };

        if (err && err.data.error.symbol) {
            console.log('Subscription error:', err.data.error.symbol);
            return callback();
        } else if (response.data.subscriptions.subscription) {

            if (response.data.subscriptions.subscription.length > 1) {
                subscription.data.subscription = response.data.subscriptions.subscription[0];
            } else {
                subscription.data.subscription = response.data.subscriptions.subscription;
            }
        }

        Team.UpdateSubscription(user._id, subscription, function(status, err, response) {
            if (err) return callback(err);

            return callback();
        });
    });
};

router.get('/google/callback', function(req, res, next) {
    passport.authenticate('google', function(err, user, info) {

        if (err) return next(err);
        // once we switch from private beta to public beta remove the signup redirect and the betaProduction conditional
        if (!user && info.betaProduction) {
            return res.redirect('https://www.arrays.co/signup');
        } else if (!user) {
            return res.redirect('/auth/login')
        } else {
            if (!user._team || user._team.length === 0) {
                return res.redirect('/signup/info/' + user._id);

            } else {

                req.logIn(user, function(err) {
                    if (err) return next(err);

                    
                    // Update subscription info from Recurly
                    updateSubscriptionInfo(user, function(err) {
                        if (err) return next(err);

                        return res.redirect(req.session.returnTo || '/dashboard');
                    });
                    
                });
            }
        }
    })(req, res, next);
});

router.post('/login', function(req, res, next) {
    passport.authenticate('local', function(err, user, info) {



        if (err) return next(err);
        if (!user) {
            if (info.message == "no team set up") {
                return res.redirect('/signup/info/' + info.userId);
            } else {

                req.flash("error", info);
                return res.redirect('login');
            }

        } else {
            req.logIn(user, function(err) {
                if (err) return next(err);

                if (process.env.NODE_ENV == 'enterprise') {
                    return res.redirect(req.session.returnTo || '/dashboard');
                } else {
                    // Update subscription info from Recurly
                    updateSubscriptionInfo(user, function(err) {
                        if (err) return next(err);

                        return res.redirect(req.session.returnTo || '/dashboard');
                    });

                }
                
                
            });
        }
    })(req, res, next);
});

router.get('/login', function(req, res) {
    if (req.user) {
        User.findById(req.user, function(err, user) {


            if (user) {
                if (!user.defaultLoginTeam || user._team.length === 0) {
                    return res.redirect('/signup/info/' + req.user);

                } else {
                    return res.redirect('/dashboard');
                }
            } else {
                res.render('auth/login', {
                    env: process.env,
                    flash: info
                });

            }
        });

    } else {
        var info = req.flash();
        res.render('auth/login', {
            env: process.env,
            flash: info
        });
    }
});

router.get('/logout', function(req, res) {
    req.logout();
    res.status(200).send('ok');

});

module.exports = router;