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
                    _team: foundUser._team._id,
                    provider: 'local'
                }
                User.create(new_user,function(err,createdUser) {
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

