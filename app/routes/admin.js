var winston = require('winston');
var express = require('express');
var passport = require('passport');
var ensureLoggedIn = require('connect-ensure-login').ensureLoggedIn('/auth/login');
var router = express.Router();

var admin_index_controller = require('../controllers/admin/');

router.get('/', ensureLoggedIn, function (req, res) {
    admin_index_controller.BindData(req, function (err, bindData) {
        if (err) {
            winston.error("❌  Error getting bind data for Admin index: ", err);
            res.status(500).send(err.response || 'Internal Server Error');

            return;
        }
        res.render('admin/index', bindData);
    });
});

module.exports = router;
