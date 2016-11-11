var winston = require('winston');
var express = require('express');
var ensureLoggedIn = require('connect-ensure-login').ensureLoggedIn('/auth/login');
var router = express.Router();

var controller = require('../../controllers/admin/account');

router.get('/', ensureLoggedIn, function (req, res) {
    res.redirect('/admin/account');
});

router.get('/account', ensureLoggedIn, function (req, res) {
    controller.index(req, function (err, data) {
        if (err) {
            winston.error("❌  Error getting bind data for Account index: ", err);
            res.status(500).send(err.response || 'Internal Server Error');

            return;
        }
        res.render('admin/account', data);
    });
});

router.post('/account/:userId', ensureLoggedIn, function (req, res) {

    // Limit to editing own user account
    if (req.user.id !== req.params.userId) {
        return res.sendStatus(401);
    }

    controller.update(req, function (err) {
        if (err) {
            winston.error("❌  Error getting bind data for Account update: ", err);
            res.status(500).send(err.response || 'Internal Server Error');

            return;
        }
        req.flash('message', 'Account settings have been updated.');
        res.redirect('/admin/account');
    });
});

module.exports = router;