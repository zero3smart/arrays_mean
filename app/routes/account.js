var express = require('express');
var router = express.Router();
var jwt = require('jsonwebtoken');

router.get('/verify', function(req, res) {
    var token = req.query.token;
    jwt.verify(token,process.env.SESSION_SECRET,function(err,decoded) {
        if (err) {
        	res.redirect('/signup/error?name='+ err.name+'&msg=' + err.message);
        }
    })



    


   
});



router.get('/invitation', function (req, res) {
  
});


module.exports = router; 