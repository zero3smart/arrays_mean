var express = require('express');
var passport = require('passport');
var router = express.Router();
var jwt = require('jsonwebtoken');


router.get('/google', passport.authenticate('google', {
    scope: ['https://www.googleapis.com/auth/userinfo.profile',
        'https://www.googleapis.com/auth/userinfo.email']
}));


router.get('/google/callback',function(req,res,next) {
    passport.authenticate('google',
        function(err,user,info) {

        if (err) {return next(err);}
        if (!user) {return res.redirect('auth/login');}
        else {

            if (!user._team) {
                return res.redirect('/signup/info/' + user._id);
                
            } else {
                req.logIn(user,function(err) {
                    if (err) {return next(err);}
                    return res.redirect(req.session.returnTo || '/admin');
                })
            }
        }
    })(req,res,next);
})

router.post('/login',function(req,res,next) {
    passport.authenticate('local',function(err,user,info) {
        if (err) {return next(err);}
        if (!user) {
            return res.json(401, {error: info});
        } else {
            var token = jwt.sign({_id:user._id},process.env.SESSION_SECRET);
            var userInfo = {
                _id: user._id,
                provider: user.provider,
                _team: user._team,
                firstName: user.firstName,
                lastName: user.lastName,
                authToken: token
            }
            return res.json(userInfo);
        }
    })(req,res,next);
})

router.get('/login', function (req, res) {


    if (req.user) {
        res.redirect('/admin');
    } else {
        var info = req.flash();
        res.render('auth/login', {
            env: process.env,
            flash: info
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

module.exports = router;