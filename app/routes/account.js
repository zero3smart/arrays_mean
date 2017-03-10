var express = require('express');
var router = express.Router();
var jwt = require('jsonwebtoken');
var User = require('../models/users');
var async = require('async');
var datasource_description = require('../models/descriptions');

router.get('/reset_password',function(req,res) {

    var token = req.query.token;
    jwt.verify(token,process.env.SESSION_SECRET,function(err,decoded) {
        if (err ) return res.redirect('/reset/password?err=' +err.name + '&msg=' + err.message);
        var userId = decoded._id;
        return res.redirect('/reset/password?userId=' + userId);
    })
})

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
    var token = req.query.token;
    jwt.verify(token,process.env.SESSION_SECRET,function(err,decoded) {
        if (err) {
            return res.render("partials/invitation.error.html", {name: err.name, message: err.message});
        } else {
            assignRoleToUser(decoded,function(err) {
                if (err) {
                    return res.render("partials/invitation.error.html", {name: err.name, message: err.message});
                } else {
                    return res.redirect("/signup/info/"+ decoded._id);
                }
            })
        }
    })
  
});

function compareArrays(array1,array2) {
    if (array1.length !== array2.length) {
        return false;
    }
    for (var i = 0; i < array1.length; i++) {
        if (array1[i] !== array2[i]) {
            return false;
        }
    }
    return true;
}


function assignRoleToUser (decoded,callback) {


    if (!decoded._viewers) {
        decoded._viewers = [];
    }
    if (!decoded._editors) {
        decoded._editors = [];
    }
    
    User.findByIdAndUpdate(decoded._id,{$set: {"_editors" : decoded._editors, "_viewers" : decoded._viewers}})
    .exec(function(err) {
        if (err) {
            callback(err);
        } else {
            User.findById(decoded.host)
            .exec(function(err,admin) {
                if (err) {

                } else {
                    delete admin.invited[decoded._id];
                    admin.markModified('invited');
                    admin.save(callback);
                }
            }) 


        }
    })

}




module.exports = router; 