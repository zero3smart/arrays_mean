var winston = require('winston');
var express = require('express');
var router = express.Router();
var ensureAuthorized = require('../libs/utils/ensureAuthorized').ensureAuthorized;

router.get('/create', ensureAuthorized, function (req, res, next) {
    // Redirect to array index
    res.redirect('/array');
});

var index_controller = require('../controllers/client/data_preparation');

router.get('/', ensureAuthorized, function (req, res, next) {

    index_controller.BindData(req, function (err, bindData) {
        if (err) {
            winston.error("❌  Error getting bind data for Array index: ", err);
            res.status(500).send(err.response || 'Internal Server Error');

            return;
        }

        res.render('array/index', bindData);
    });

});

module.exports = router;