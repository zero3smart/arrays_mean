var winston = require('winston');
var express = require('express');
var ensureLoggedIn = require('connect-ensure-login').ensureLoggedIn('/auth/login');
var router = express.Router();

var controller = require('../../controllers/admin/users');

router.get('/', ensureLoggedIn, function(req, res) {
    controller.index(req, function(err, data) {
        if (err) {
            winston.error("❌  Error getting bind data for users index: ", err);
            res.status(500).send(err.response || 'Internal Server Error');

            return;
        }
        res.render('admin/users', data);
    });
});

module.exports = router;