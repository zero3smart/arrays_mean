var url = require('url');
var winston = require('winston');
var queryString = require('querystring');
var ensureLoggedIn = require('connect-ensure-login').ensureLoggedIn();
var express = require('express');
var router = express.Router();

var admin_index_controller = require('../controllers/admin/');

router.get('/', function (req, res) {
    admin_index_controller.BindData(function (err, bindData) {
        if (err) {
            winston.error("❌  Error getting bind data for Admin index: ", err);
            res.status(500).send(err.response || 'Internal Server Error');

            return;
        }
        res.render('admin/index', bindData);
    });
});

module.exports = router;
