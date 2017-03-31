var User = require('../../models/users');
var Team = require('../../models/teams');
var mailer = require('../../libs/utils/nodemailer');
var jwt = require('jsonwebtoken');
var Batch = require('batch');
var datasource_descriptions = require('../../models/descriptions');
var sample_dataset = require('./sample_dataset');
var winston = require('winston');

module.exports.index = function (req, next) {
    var self = this;

    var data = {
        env: process.env,

        flash: req.flash('message'),

        user: req.user
    };

    next(null, data);
};


module.exports.search = function (req, res) {
    User.find(req.query, function (err, foundUsers) {
        if (err) {
            res.send(err);
        } else {
            res.json(foundUsers);
        }

    })
};

module.exports.checkPw = function(req,res) {



    var userId = req.params.id;
    User.findById(userId,function(err,user) {
        if (err) res.send(err);
        else {
            if (user.validPassword(req.body.password)) {
                res.json({valid: true});
            } else {
                res.json({valid: false});
            }
        }
    })
}

module.exports.getAll = function(req, res) {
    if (!req.user) {
        res.status(401).send({ error: 'unauthorized' });
    }
    var teamId = req.params.teamId;
    User.find({ _team: teamId, _id: { $ne: req.user } })
        .exec(function(err, allOtherUsers) {
            if (err) {
                res.send(err);
            } else {
                res.json(allOtherUsers);
            }
        });
};

module.exports.get = function (req, res) {

    var id = req.params.id;

    if (id == 'currentUser') {
        if (!req.user) {

            res.status(401).send({error: 'unauthorized'});
        } else {
            var userId = req.user;
            User.findById(userId)
                .populate('_team')
                .populate('defaultLoginTeam')
                .exec(function (err, user) {


                    if  (err) return res.status(500).send('Internal Server Error');
                    if (!user) return res.status(401).send({error: 'unauthorized'});



                    var token = jwt.sign({_id: user._id}, process.env.SESSION_SECRET);
                    var role;


                    if (!user.defaultLoginTeam || user._team.length == 0) {
                        return res.status(401).json({error: 'unauthorized'});
                    }


                    if (user.isSuperAdmin()) {
                        role = 'superAdmin';
                    } else if (user.defaultLoginTeam.admin && user.defaultLoginTeam.admin == userId) {
                        role = 'admin'
                    } else {
                        var isEditor = _checkIfUserIsEditor(user.defaultLoginTeam.datasourceDescriptions,user._editors);
                        if (isEditor) {
                            role = 'editor';
                        } else {
                            role = 'viewer';
                        }
                    }



                    var userInfo = {
                        _id: user._id,
                        provider: user.provider,
                        email: user.email,
                        _team: user._team,
                        firstName: user.firstName,
                        lastName: user.lastName,
                        _editors : user._editors,
                        _viewers: user._viewers,
                        authToken: token,
                        invited: user.invited,
                        role: role,
                        defaultLoginTeam: user.defaultLoginTeam,
                        createdAt: user.createdAt,
                        sampleImported: user.sampleImported
                    }


                    return res.status(200).json(userInfo);

                })
        }

    } else {

        User.findById(id)
            .populate('_team')
            .lean()
            .exec(function (err, user) {
                if (err) {
                    res.send(err);
                } else {
                    user.team = user._team;
                    res.json(user);
                }
            })


    }

}

var _checkIfUserIsEditor = function(teamDatasourceDescriptions, userEditors) {

    for (var i = 0; i < teamDatasourceDescriptions.length; i++) {
        var datasetId = teamDatasourceDescriptions[i];
        if (userEditors.indexOf(datasetId) >= 0) {
            return true;
        }
    }
    return false;
}

module.exports.create = function (req, res) {


    User.create(req.body, function (err, user) {

        if (err) {
            res.status(500).send(err);
        } else {
            res.status(200).json(user);
        }
    })



}

//reset password
module.exports.reset = function(req,res) {
    var userId = req.params.id;
    if (!userId) {
        return res.status(401).json({err:'unauthorized'});
    }
    User.findById(userId,function(err,user){
        if (err) return res.send(err);
        else if (!user) {
            return res.status(404).json({err:'Cannot find User'});
        } else {
            mailer.sendResetPasswordEmail(user,function(err) {
                if (err) {
                    res.status(500).json({err:'Cannot resend email to reset password'});
                } else {
                    res.json({data:'ok'})
                }

            })

        }
    })
}


module.exports.resend = function (req, res) {
    var userId = req.params.id;
    if (!userId) {
        return res.status(401).send('unauthorized');
    }
    if (req.query.emailType == 'activation') {
        User.findById(userId, function (err, user) {
            if (err) {
                res.send(err);
            }
            else if (!user) {
                res.status(404).send('Cannot find User');
            } else {
                mailer.sendActivationEmail(user, function (err) {
                    if (err) {
                        res.status(500).send('Cannot resend activation email');
                    } else {
                        return res.redirect('/signup/success/' + userId);
                    }
                })
            }
        })

    } else { //resend invitation user
        var inviteeId = req.query.Invitee;


        if (!inviteeId) {
            return res.status(500).send('invalid parameter');
        }
        User.findById(userId)
        .populate('defaultLoginTeam')
        .exec(function(err,foundUser) {
            if (err) {
                return res.status(500).send(err);
            } else if (!foundUser) {
                return res.status(401).send("No user found");
            } else {
                for (var id in foundUser.invited) {
                    if (id == inviteeId) {
                        User.findById(inviteeId,function(err,invitee) {
                            if (err) {
                                return res.status(500).send(err);
                            } else if (!invitee) {
                                return res.status(401).send("No user found");
                            }
                            mailer.sendInvitationEmail(foundUser.defaultLoginTeam,foundUser,
                                invitee,foundUser.invited[id]._editors, foundUser.invited[id]._viewers,function(err){
                                    if (err) {
                                        res.status(500).send('Cannot resend invitation email');
                                    } else {
                                        res.status(200).send('ok');
                                    }
                                })
                        })
                    }
                }
            }
        })
    }
}

module.exports.updateProfile = function(req,res) {

    var userId = req.params.id;
    User.findById(userId,function(err,user) {
        if (err) return res.send(err);

        for (var key in req.body) {
            if (key == 'password') {
                user.setPassword(req.body[key]);
            }
        }
        user.save(function(err) {
            if (err) return res.send(err);
            else {
                res.json(user);
            }
        })

    })
}






module.exports.update = function (req, res) {


    var team = req.body._team;
    var teamId = req.body._team._id;



    if (!teamId) { // admin/owner of the team signing up

        var batch = new Batch();
        batch.concurrency(1);
        var t;
        var u;

        batch.push(function(done) {
            if (process.env.NODE_ENV == 'enterprise' && process.env.subdomain) {
                Team.findOne({subdomain: process.env.subdomain},function(err,sub) {
                    if (sub) t = sub;
                    done(err);
                })
            } else done();
        })

        batch.push(function(done) {
            if (!t) {
                team.admin = req.body._id;
                if (req.body._team.subdomain == 'schema' || process.env.NODE_ENV == 'enterprise' || req.body.email.indexOf('@schemadesign.com') >= 0 ||
                    req.body.email.indexOf('@arrays.co') >= 0) {

                    team.superTeam = true;
                    if (process.env.NODE_ENV == 'enterprise') team.isEnterprise = true;
                }

                Team.create(team,function(err,createdTeam) {
                    if (createdTeam) t = createdTeam;
                    done(err);
                })

            } else done();


        })

        batch.push(function(done) {

            User.findById(req.body._id,function(err,user) {
                if (!err && user) {
                    if(process.env.HOST !== 'local.arrays.co:9080' && t.title !== 'sampleTeam' &&
                        process.env.NODE_ENV !== 'enterprise') {
                        // create sample dataset
                        sample_dataset.delegateDatasetDuplicationTasks(user, t, function (err) {
                            console.log(err);
                        });
                    }
                    user.firstName = req.body.firstName;
                    user.lastName = req.body.lastName;
                    if (user.provider == 'local' && req.body.password && (!user.hash || !user.salt)) {
                        user.setPassword(req.body.password);
                    }
                    user._team = [t._id];
                    user.defaultLoginTeam = t._id;
                    u = user;
                    done();

                } else done(err);

            })

        })

        batch.push(function(done) {
            u.save(function (err, savedUser) {
                done(err);
                u = savedUser;
                done();


            })

        })

        batch.end(function(err) {
            if (err) res.send(err);
            else {
                if (process.env.NODE_ENV !== 'enterprise') {
                    t.notifyNewTeamCreation();
                }
                if (u.activated) {
                    res.json(u);
                } else {
                     mailer.sendActivationEmail(u, function (err) {
                        if (err) {
                            res.status(500).send('Cannot send activation email');
                        } else {
                            res.json(u);
                        }
                    })

                }

            }

        })

        // Team.create(team, function (err, createdTeam) {
        //     if (err) {
        //         res.send(err);
        //     }
        //     else {
        //         teamId = createdTeam._id;
        //         User.findById(req.body._id, function (err, user) {
        //             if (err) {
        //                 res.send(err);
        //             } else if (!user) {
        //                 res.status(404).send('User not found');
        //             } else {
        //                 // this will be a pain to have in dev if ever someone wants to wipe their local db, setting to production only for now
        //                 // also if we're creating sampleTeam for the first time
        //                 if(process.env.HOST !== 'local.arrays.co:9080' && createdTeam.title !== 'sampleTeam' &&
        //                     process.env.NODE_ENV !== 'enterprise') {
        //                     // create sample dataset
        //                     sample_dataset.delegateDatasetDuplicationTasks(user, createdTeam, function (err) {
        //                         if (err) {
        //                             res.send({error: err})
        //                         }
        //                     });
        //                 }
        //                 user.firstName = req.body.firstName;
        //                 user.lastName = req.body.lastName;
        //                 if (user.provider == 'local' && req.body.password && (!user.hash || !user.salt)) {
        //                     user.setPassword(req.body.password);
        //                 }
        //                 user._team = [teamId];
        //                 user.defaultLoginTeam = teamId;
        //                 user.save(function (err, savedUser) {
        //                     if (err) {
        //                         res.send(err);
        //                     }
        //                     else {
        //                         createdTeam.notifyNewTeamCreation();

        //                         if (user.activated) {
        //                             res.json(savedUser);
        //                         } else {
        //                             mailer.sendActivationEmail(savedUser, function (err) {
        //                                 if (err) {
        //                                     res.status(500).send('Cannot send activation email');
        //                                 } else {
        //                                     res.json(savedUser);
        //                                 }
        //                             })
        //                         }

        //                     }
        //                 })
        //             }
        //         })
        //     }
        // })

    } else { //invited people, no need to send email
        User.findById(req.body._id, function (err, user) {
            if (err) {
                res.send(err);
            } else if (!user) {
                res.status(404).send('User not found');
            } else {
                user.firstName = req.body.firstName;
                user.lastName = req.body.lastName;
                user.activated = true;
                if (user.provider == 'local' && req.body.password) {
                    user.setPassword(req.body.password);
                }
                user.save(function (err, savedUser) {
                    if (err) {
                        res.send(err);
                    }
                    else {
                        mailer.newUserAcceptedInvitationEmail(team,savedUser,function(err) {
                            if (err) winston.error('cannot send user alert email for user accepting invitation');
                            else {
                                winston.info('User Accepted Invitation Email sent');
                            }
                        })
                        res.json(savedUser);
                    }
                })
            }
        })
    }
};


module.exports.save = function(req, res) {

    if (!req.params.id) { return res.send(new Error('No Id given'))};

    User.findById(req.params.id, function(err, user) {
        if (err) return res.send(err);
        if (!user) return res.send(new Error('No User Exists'));

        user.firstName = req.body.firstName;
        user.lastName = req.body.lastName;
        user.active = req.body.active;
        user._editors = req.body._editors;
        user._viewers = req.body._viewers;
        user._team = req.body._team;
        if (req.body.defaultLoginTeam) {
            user.defaultLoginTeam = req.body.defaultLoginTeam;
        }
        user.save(function (err, savedUser) {
            if (err)
                res.send(err);
            else
                res.json(savedUser);
        });
    });
};

module.exports.sampleImported = function(req, res) {
   User.findByIdAndUpdate(req.user,{$set: {sampleImported: req.body.sampleImported}})
    .exec(function(err,result) {
        if (err) return res.send(err);
        return res.status(200).json(result);
    })
}

module.exports.defaultLoginTeam = function(req,res) {
    var teamId = req.params.teamId;
    if (!teamId) {
        return res.status(500).send(new Error("No teamId given"));
    }
    if (!req.user) {
        return res.status(401).send("unauthorized");
    } else {
        User.findByIdAndUpdate(req.user,{$set: {defaultLoginTeam: teamId}})
        .exec(function(err,result) {
            if (err) return res.send(err);
            return res.status(200).json(result);
        })
    }
}

module.exports.delete = function(req, res) {



    if (!req.user) {
        return res.status(401).send({error: 'unauthorized'});
    }

    var batch = new Batch();
    batch.concurrency(1);

    var u;
    var teamToRemoveFrom;



    batch.push(function(done) {

        User.findById(req.user,function(err,userMadeRequest) {
            if (err) return done(err);
            teamToRemoveFrom = userMadeRequest.defaultLoginTeam;
            done();
        })

    })


    batch.push(function(done) {



        User.findById(req.params.id)
        .populate('_editors')
        .populate('_viewers')
        .exec(function(err,user) {

            if (err) return done(err);
            if (!user) return done(new Error('No User Exists'));
            u = user;
            a = user.defaultLoginTeam.admin; // not used?
            done();

        })

    })



    batch.push(function(done) {


        datasource_descriptions.find({author:u._id,_team: teamToRemoveFrom})
        .populate('_team')
        .exec(function(err,datasets) {

            if (err) return done(err);

            datasets.forEach(function(dataset) {
                dataset.author = dataset._team.admin;
                dataset.save();
            })

            done();
        })

    })

    batch.push(function(done) {
        datasource_descriptions.find({updatedBy: u._id, _team: teamToRemoveFrom})
        .populate('_team')
        .exec(function(err,datasets) {
            if (err) return done(err);
            datasets.forEach(function(dataset) {
                dataset.updatedBy = dataset._team.admin;
                dataset.save();
            })
            done();
        })

    })

    batch.push(function(done) {
        var idx = u._team.indexOf(teamToRemoveFrom);
        if (idx >= 0) {
            u._team.splice(idx,1);
        }
        if (u.defaultLoginTeam.equals(teamToRemoveFrom)) {
            if (u._team.length == 0) {
                u.defaultLoginTeam = undefined;
            } else u.defaultLoginTeam = u._team[0];
        }
        u._editors = u._editors.filter(function(ds) {

            return !ds._team.equals(teamToRemoveFrom);

        })
        u._viewers = u._viewers.filter(function(ds) {
            return !ds._team.equals(teamToRemoveFrom);
        })
        u.save(done);
    })

    batch.end(function(err) {
        if (err) return res.send(err);
        else {
            winston.info("✅  Removed user  : " + u._id + 'from Team: ' + teamToRemoveFrom );
            res.json({success:'ok'});
        }

    })

};