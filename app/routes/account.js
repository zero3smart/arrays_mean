var express = require('express');
var router = express.Router();
var jwt = require('jsonwebtoken');
var User = require('../models/users');
var async = require('async');
var datasource_description = require('../models/descriptions');

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
            assignRoleToDatasets(decoded,function(err) {
                if (err) {
                    return res.render("partials/invitation.error.html", {name: err.name, message: err.message});
                } else {
                    //TODO: only redirect to here when user is new, otherwise -> /auth/login show message "The invitation" has 
                    // been confirmed;
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


function assignRoleToDatasets(decoded,callback) {
    async.each(decoded.datasets,function(datasetId,eachCb) {
        var pushQuery = {$push: {}};
        if (decoded.role == 'editor') {
            pushQuery.$push["_editors"] = datasetId
        } else if (decoded.role == 'viewer') {
            pushQuery.$push["_viewers"] = datasetId
        }
        User.findByIdAndUpdate(decoded._id,pushQuery,function(err) {
            eachCb(err);
        })

    },function(err) {
        if (!err) {
            User.findById(decoded.admin,function(err,theAdmin) {
                if (!err) {
                    for (var i = 0; i < theAdmin.invited.length; i++) {
                        if (theAdmin.invited[i].user == decoded._id && theAdmin.invited[i].role == decoded.role &&
                            compareArrays(theAdmin.invited[i].datasets,decoded.datasets)) {
                            theAdmin.invited.splice(i,1);
                            break;
                        }
                    }
                    theAdmin.save(function(err) {
                        callback(err);

                    });
                } else {
                    callback(err);
                }
            })

        } else {
            callback(err);
        }
    })
}




module.exports = router; 