var Team = require('../../models/teams');
var User = require('../../models/users')
var s3ImageHosting = require('../../libs/utils/aws-image-hosting');
var _ = require('lodash');
var Batch = require('batch');
<<<<<<< Updated upstream
var datasource_file_service = require('../../libs/utils/aws-datasource-files-hosting');
var datasource_description = require('../../models/descriptions');
=======
var s3FileHosting = require('../../libs/utils/aws-datasource-files-hosting')
>>>>>>> Stashed changes


module.exports.getAll = function (req, res) {

    Team.find({})
        .exec(function (err, teams) {
            if (err) {
                res.send({error:err.message});
            } else {
                res.status(200).json(teams);
            }
        })

};


module.exports.create = function (req, res) {
    Team.create(req.body, function (err, createdTeam) {
        if (err) {
            res.send({error: err.message});
        } else {
            if (req.user) {

                User.findById(req.user,function(err,user) {
                    if (err) {
                        res.send({error: err.message});
                    } else {
                        user._team.push(createdTeam._id);
                        user.save();
                    }
                });
            }
            res.json(createdTeam);
        }
    })
}

module.exports.search = function (req, res) {

    Team.find(req.query, function (err, foundTeams) {
        if (err) {
            res.send({error: err.message});
        } else {
            return res.status(200).json(foundTeams);
        }

    })
}

module.exports.update = function (req, res) {
    Team.findByIdAndUpdate(req.params.id)
        .exec(function (err, team) {
            if (err) {
                return res.status(500).send(err);
            } else if (!team) {
                return res.status(404).send("Team not found.");
            } else {
                for (var attr in req.body) {
                    team[attr] = req.body[attr];
                }
                team.save(function (err) {
                    if (!err) {
                        return res.json({team: team});
                    } else {
                        return res.status(500).send({error: err.message});
                    }
                })
            }
        })
}


module.exports.signedUrlForAssetsUpload = function (req, res) {

    Team.findById(req.params.id)
        .exec(function (err, team) {
            var key;
            if (req.query.assetType == 'logo' || req.query.assetType == 'logo_header') {
                key = team.subdomain + '/assets/logo/' + req.query.fileName
            } else if (req.query.assetType == 'icon') {
                key = team.subdomain + '/assets/icon/' + req.query.fileName
            }
            s3ImageHosting.signedUrlForPutObject(key, req.query.fileType, function (err, data) {
                if (err) {
                    return res.status(500).send({error:err.message});
                } else {
                    return res.json({putUrl: data.putSignedUrl, publicUrl: data.publicUrl});
                }
            })

        })

}


module.exports.loadIcons = function (req, res) {
    if (req.user) {
        User.findById(req.user)
            .populate('defaultLoginTeam')
            .exec(function (err, user) {
                if (err) {
                    res.status(500).send({error: err.message});
                } else {
                    s3ImageHosting.getAllIconsForTeam(user.defaultLoginTeam.subdomain, function (err, data) {
                        if (err) {
                            res.status(500).send({error: err.message})
                        } else {
                            res.json({iconsUrl: data});
                        }
                    })

                }

            })
    } else {
        res.status(401).send({error:'unauthorized'});
    }
}


<<<<<<< Updated upstream

module.exports.delete = function(req,res) {


    if (req.user) {
        var batch = new Batch();
        batch.concurrency(1);

        var teamToDelete;

        var unauthorized = false;

        batch.push(function(done) {
            Team.findById(req.params.id,function(err,team) {
                if (err) done(err);
                else {
                    teamToDelete = team;
                    // if (team.admin == req.user) done(); //comment out, can team admin delete team?
                    batch.push(function(done) {
                        User.findById(req.user,function(err,user) {
                            if (err) done(err);
                            else {

                                console.log(user);
                                if (user.isSuperAdmin()) done();
                                else {
                                    unauthorized = true;
                                    done();
                                }
                            }
                        })
                    })
                    done();

                }
                
            })
        })

        batch.push(function(done) {
            if (!unauthorized) {

                datasource_description.find({_team:teamToDelete._id},function(err,datasets) {
                    if (err) done(err);
                    else {
                    
                        datasets.forEach(function(dataset) {
                            dataset.remove();
                        })
                        done();
                    }
                })


            } else {
                done();
            }
        })

        batch.push(function(done) {
            datasource_file_service.deleteTeam(teamToDelete.subdomain,done);
        })

        batch.push(function(done) {
            if (!unauthorized) {
                User.find({_team: teamToDelete._id},function(err,allusers) {
                    if (err) done(err);
                    else {

                        if (allusers) {

                            allusers.forEach(function(user) {

                                var index = user._team.indexOf(teamToDelete._id);
                                if (index >= 0) {
                                    user._team.splice(index,1);
                                  
                                    if (user.defaultLoginTeam == teamToDelete._id.toString()) {
                                        user.defaultLoginTeam = null;
                                        if (user._team.length == 0) {
                                            user.defaultLoginTeam = null
                                        } else {
                                            user.defaultLoginTeam = user._team[0];
                                        }
                                    }

                                    user.markModified('defaultLoginTeam');
                                    user.markModified('_team');
                                    user.save();
                                } 
                            })
                            done();

                        } else {
                            done();
                        }
                    }

                })
            } else {
                done();
            }
        })

        batch.push(function(done) {
            teamToDelete.remove(done);
        })

        batch.end(function(err) {
            if (err) {
                console.log(err);
                return res.status(500).send(err);
            }
            if (unauthorized)  res.status(401).send({error:'unauthorized'});
            else {
                return res.json({message: 'ok'});
            }
        })


    } else {
        res.status(401).send({error:'unauthorized'});
=======
module.exports.deleteImage = function (req, res) {
    if(req.user) {
        console.log(req.params);
        console.log(req.params.subdomain);
        var key = req.params.subdomain + "/" + req.params.assets + "/" + req.params.type + "/" + req.params.filename;
        // delete the key from s3
        s3FileHosting.deleteObject(key, function(err, data) {
            if(err) {
                res.status(500).send({error: err.message});
            } else {
                Team.findByIdAndUpdate(req.params.id, {$unset: {logo: ""}}, {new: true}, function (err, updatedDoc) {
                    if(err) {
                        console.log(err);
                        return res.status(500).send({error: err.message});
                    } else {
                        return res.json({doc: updatedDoc});
                    }
                })
            }
        })
    }  else {
        return res.status(401).send({error:'unauthorized'});
>>>>>>> Stashed changes
    }
}


<<<<<<< Updated upstream


=======
>>>>>>> Stashed changes
module.exports.switchAdmin = function(req,res) {

    var newAdminId = req.params.id;
    if (req.user) {
        var batch = new Batch();
        batch.concurrency(1);

        var newAdmin;
        var team;
        var oldAdmin;

        //find the oldAdmin
        batch.push(function(done) {
            User.findById(req.user)
            .populate('defaultLoginTeam')
            .exec(function(err,superAdminOrAdmin) {
                if (err) return done(err);
                team = superAdminOrAdmin.defaultLoginTeam;
                oldAdmin = team.admin;
                done();
            })
        })

        //pull new Admin's editor and viewer related to the team
        batch.push(function(done) {
            User.findById(newAdminId)
            .populate([{path:'_editors',select:'_team'}, {path:'_viewers',select: '_team'}])
            .exec(function(err,newAdmin) {
                if (err) done(err);
                else {
                    newAdmin._editors = newAdmin._editors.filter(function(value) {
                        return value._team == team._id;
                    })
                    newAdmin._viewers = newAdmin._viewers.filter(function(value) {
                        return value._team == team._id;
                    })
                    newAdmin.markModified('_editors');
                    newAdmin.markModified('_viewers');
                    newAdmin.save(done);
                }
            })
        })


        //pull old Admin's editor and viewer role related to the team
        batch.push(function(done) {
             User.findById(oldAdmin)
            .populate([{path:'_editors',select:'_team'}, {path:'_viewers',select: '_team'}])
            .exec(function(err,oldAdmin) {
                if (err) done(err);
                else {
                    oldAdmin._editors = oldAdmin._editors.filter(function(value) {
                        return value._team == team._id;
                    })
                    oldAdmin._viewers = oldAdmin._viewers.filter(function(value) {
                        return value._team == team._id;
                    })
                    oldAdmin.markModified('_editors');
                    oldAdmin.markModified('_viewers');
                    var index = oldAdmin._team.indexOf(team._id);
                    oldAdmin._team.splice(index,1);
                    if (oldAdmin.defaultLoginTeam == team._id) {
                        oldAdmin.defaultLoginTeam = undefined;
                    }
                    oldAdmin.markModified('_team');
                    oldAdmin.markModified('defaultLoginTeam');
                    oldAdmin.save(done);

                }
            })
        })


        //set this newAdmin to the team
        batch.push(function(done) {
            Team.findOneAndUpdate({_id:team._id},{admin:newAdminId},done);
        })
      
        batch.end(function(err) {
            if (err) {
                res.status(500).send({error:err.message});
            } else {
                res.status(200).send({error:null});
            }

        })

    } else {
        res.status(401).send({error: "unauthorized"});
    }

}





