var winston = require('winston');
var express = require('express');
var passport = require('passport');
var ensureLoggedIn = require('connect-ensure-login').ensureLoggedIn('/auth/login');
var router = express.Router();

var account_controller = require('../controllers/admin/account');
var dataset_controller = require('../controllers/admin/dataset');
var website_controller = require('../controllers/admin/website');
var users_controller = require('../controllers/admin/users');

router.get('/', ensureLoggedIn, function(req, res) {
    res.redirect('/admin/account');
});

/***************  Account ***************/
router.get('/account', ensureLoggedIn, function(req, res) {
    account_controller.index(req, function(err, data) {
        if (err) {
            winston.error("❌  Error getting bind data for Account index: ", err);
            res.status(500).send(err.response || 'Internal Server Error');

            return;
        }
        res.render('admin/account', data);
    });
});

router.post('/account/:userId', ensureLoggedIn, function(req, res) {

    // Limit to editing own user account
    if (req.user.id !== req.params.userId) {
        return res.sendStatus(401);
    }

    account_controller.update(req, function(err) {
        if (err) {
            winston.error("❌  Error getting bind data for Account update: ", err);
            res.status(500).send(err.response || 'Internal Server Error');

            return;
        }
        req.flash('message', 'Account settings have been updated.');
        res.redirect('/admin/account');
    });
});

/***************  Dataset ***************/
router.get('/dataset', ensureLoggedIn, function(req, res) {
    dataset_controller.index(req, function(err, data) {
        if (err) {
            winston.error("❌  Error getting bind data for Dataset index: ", err);
            res.status(500).send(err.response || 'Internal Server Error');

            return;
        }
        res.render('admin/dataset', data);
    });
});

router.get('/dataset/sign-s3', ensureLoggedIn, function(req, res) {
    dataset_controller.signS3(req, function(err, data) {
        if (err) {
            winston.error("❌  Error getting bind data for Dataset signS3: ", err);
            res.status(500).send(err.response || 'Internal Server Error');

            return;
        }
        res.write(JSON.stringify(data));
        res.send();
    });
});

/***************  Website ***************/
router.get('/website', ensureLoggedIn, function(req, res) {
    website_controller.index(req, function(err, data) {
        if (err) {
            winston.error("❌  Error getting bind data for Website index: ", err);
            res.status(500).send(err.response || 'Internal Server Error');

            return;
        }
        res.render('admin/website', data);
    });
});

/***************  Users ***************/
router.get('/users', ensureLoggedIn, function(req, res) {
    users_controller.index(req, function(err, data) {
        if (err) {
            winston.error("❌  Error getting bind data for users index: ", err);
            res.status(500).send(err.response || 'Internal Server Error');

            return;
        }
        res.render('admin/users', data);
    });
});

module.exports = router;
