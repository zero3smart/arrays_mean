var express = require('express');
var router = express.Router();

router.get('/', function(req, res)
{
    var bindData =
    {
        env: process.env
    };
    res.render('homepage/homepage', bindData);
});

module.exports = router;