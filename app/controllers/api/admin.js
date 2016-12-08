var Team = require('../../models/teams');
var User = require('../../models/users');
var datasource_description = require('../../models/descriptions');
var async = require('async');
var mailer = require('../../libs/utils/nodemailer');




module.exports.invite = function(req,res) {


    User.findById(req.user)
    .populate('_team')
    .exec(function(err,foundUser) {
        if (foundUser.isSuperAdmin() || foundUser._team.admin == req.user) {
       
            if (!foundUser.invited) {
                foundUser.invited = [];
            }
            var invitedUser;
            if (!req.body._id) {
                var new_user = {
                    email: req.body.email,
                    _team: foundUser._team._id
                }
                console.log(foundUser._team);
                console.log(new_user);

                User.create(req.body,function(err,createdUser) {
                    if (err) {
                        console.log(err);
                        res.status(500).send(err);
                    } else {
                        invitedUser = createdUser._id;
                        foundUser.invited.push({user: invitedUser,datasets: req.body.datasets, role: req.body.role});
                        foundUser.save(function(err) {
                            if (err) {
                                console.log(err);
                                res.status(500).send(err);
                            } else {
                        
                                mailer.sendInvitationEmail(foundUser,createdUser,req.body.role,req.body.datasets,
                                    function(err) {
                                        if (err) res.status(500).send(err);
                                        res.send({code: 200,message: "Invitation Email sent!"});
                                    })

                            }
                        })
                        
                    }
                })
            } else {
                invitedUser = req.body._id;
                foundUser.invited.push({user: invitedUser,roleMappings:req.body.roleMappings});
                mailer.sendInvitationEmail(foundUser,req.body,req.body.role,req.body.datasets,function(err) {
                    if (err) res.status(500).send(err);
                    res.send({code: 200,message: "Invitation Email sent!"});
                })
            }
        } else {
            return res.status(401).send('unauthorized');
        }
    })
}


// function(admin,invite,role,datasets,cb)

// function assignRoleToDatasets(req,callback) {
//     asyn.each(req.body.roleMappings,function(map,eachCb) {
//         var pushQuery = {$push: {}};
//         if (map.roleMappings.role == 'editors') {
//             pushQuery.$push["editors"] = req.body._id;
//         } else if (map.roleMappings.role == 'viewer') {
//             pushQuery.$push["viewers"] = req.body._id;
//         }
//         datasource_description.update({_id: {$in: map.datasets}},pushQuery,function(err) {
//             eachCb(err);
//         })

//     },function(err) {
//         callback(err);
//     })
// }

  // if (req.body._id) {
            //     assignRoleToDatasets(req,function(err) {
            //         if (err) {
            //             res.status(500).send(err);
            //         } else {

            //         }
            //     })
            // } else {
            //     var new_user = {
            //         email: req.body.email,
            //         _team: foundUser._team._id
            //     }

            //     User.create(req.body,function(err,createdUser) {
            //         if (err) {
            //             res.status(500).send(err);
            //         } else {
            //             req.body._id = createdUser._id;
            //             assignRoleToDatasets(req,function(err) {
            //                 if (err) {
            //                     res.status(500).send(err);
            //                 } else {

            //                 }
            //             })
            //         }
            //     })
            // }          

