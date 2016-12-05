var express = require('express');
var router = express.Router();
var ensureAuthorized = require('../libs/utils/ensureAuthorized').ensureAuthorized;

router.get('/', ensureAuthorized, function (req, res) {
    var bindData =
    {
        env: process.env
    };
    res.render('homepage/homepage', bindData);
});

module.exports = router;