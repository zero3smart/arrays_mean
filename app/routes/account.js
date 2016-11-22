var express = require('express');
var router = express.Router();
var jwt = require('jsonwebtoken');
var User = require('../models/users');

router.get('/verify', function(req, res) {
    var token = req.query.token;
    jwt.verify(token,process.env.SESSION_SECRET,function(err,decoded) {
        if (err) {
        	res.redirect('/signup/error?name='+ err.name+'&msg=' + err.message);
        } else {
        	User.findOneAndUpdate({_id:decoded._id,email:decoded.email}, {$set:{activated: true}},function(err) {
        		if (err) {
        			req.flash("error",err);
                    return res.redirect('/auth/login');
        		} else {
                    req.flash("success",{message:"Account is activated. You could login with your credentials now"});
                    return res.redirect('/auth/login');
                }
        	})


        }

    })



    


   
});



router.get('/invitation', function (req, res) {
  
});


module.exports = router; 