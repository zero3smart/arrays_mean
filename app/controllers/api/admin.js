var Team = require('../../models/teams');
var User = require('../../models/users');
var datasource_description = require('../../models/descriptions');
var async = require('async');
var mailer = require('../../libs/utils/nodemailer');



module.exports.invite = function(req,res) {

    User.findById(req.user)
    .populate('defaultLoginTeam')
    .exec(function(err,foundUser) {
        if (foundUser.isSuperAdmin() || foundUser.defaultLoginTeam.admin  == req.user) {
       
            if (!foundUser.invited) {
                foundUser.invited = {};
            }
            var invitedUser;
            if (!req.body._id) { //invite is only for new user

                var new_user = {
                    email: req.body.email,
                    _team: req.body._team,
                    provider: 'local',
                    defaultLoginTeam: req.body.defaultLoginTeam
                }
                User.create(new_user,function(err,createdUser) {
                    if (err) {
                        console.log(err);
                        res.status(500).send(err);
                    } else {

                        invitedUser = createdUser._id;

                        foundUser.invited[invitedUser] = {"_editors": req.body._editors, "_viewers": req.body._viewers};
                        
                        foundUser.markModified('invited');

                        foundUser.save(function(err) {
                            if (err) {
                                console.log(err);
                                res.status(500).send(err);
                            } else {
                                Team.findById(req.body._team[0],function(err,team) {

                                    if (err) {
                                        console.log(err);
                                        res.status(500).send(err);
                                    } else {
                                        mailer.sendInvitationEmail(false,team,foundUser,createdUser,req.body._editors,req.body._viewers,
                                            function(err) {
                                                if (err) res.status(500).send(err);
                                                mailer.newUserInvitedEmail(foundUser,foundUser.defaultLoginTeam,createdUser,function(err) {
                                                    if (err) res.status(500).send(err);
                                                })
                                                return res.status(200).send({user: foundUser, invitedUser:createdUser});
                                            })
                                    }
                                })
                            }
                        })
                        
                    }
                })
            } else {


                User.findOneAndUpdate({_id: req.body._id},{$set:{_editors: req.body._editors, _viewers: req.body._viewers,_team: req.body._team,
                    defaultLoginTeam: req.body.defaultLoginTeam}},
                    {new: true},
                    function(err,user_updated) {
                        if (err) return res.status(500).send(err);

                        var t = req.body._team[req.body._team.length-1];
                        Team.findById(t,function(err,team) {
                            if (err) return res.status(500).send(err);
                             mailer.sendInvitationEmail(true,team,foundUser,user_updated,null,null,
                                function(err) {
                                      if (err) res.status(500).send(err);
                                      return res.status(200).send();
                                })
                        })
                    })
            }
        } else {
            return res.status(401).send('unauthorized');
        }
    })
}

