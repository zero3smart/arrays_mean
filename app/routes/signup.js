var express = require('express');
var passport = require('passport');
var router = express.Router();

router.get('/*', function(req, res) {

    res.render('signup/index',{
    	env: process.env
    });
});


module.exports = router;