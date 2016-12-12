var Team = require('../../models/teams');
var User = require('../../models/users')
var s3ImageHosting = require('../../libs/utils/aws-image-hosting');
var _ = require('lodash')


module.exports.getAll = function (req, res) {

    Team.find({})
        .exec(function (err, teams) {
            if (err) {
                res.send(err);
            } else {
                res.json(teams);
            }
        })

};


module.exports.create = function (req, res) {
    Team.create(req.body, function (err, createdTeam) {
        if (err) {
            res.send(err);
        } else {
            res.json(createdTeam);
        }
    })
}

module.exports.search = function (req, res) {

    Team.find(req.query, function (err, foundTeams) {
        if (err) {
            res.send(err);
        } else {
            res.json(foundTeams);
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
                    return res.status(500).send(err);
                } else {
                    return res.json({putUrl: data.putSignedUrl, publicUrl: data.publicUrl});
                }
            })

        })

}


module.exports.loadIcons = function (req, res) {
    if (req.user) {
        User.findById(req.user)
            .populate('_team')
            .exec(function (err, user) {
                if (err) {
                    res.status(500).send({error: err.message});
                } else {
                    s3ImageHosting.getAllIconsForTeam(user._team.subdomain, function (err, data) {
                        if (err) {
                            res.status(500).send({error: err.message})
                        } else {
                            res.json({iconsUrl: data});
                        }
                    })

                }

            })
    } else {
        res.status(401).send('unauthorized');
    }
}

