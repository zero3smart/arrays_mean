var User = require('../../../models/users');

var Recurly = require('node-recurly');
var recurlyConfig = {
    API_KEY: process.env.RECURLY_API_KEY ? process.env.RECURLY_API_KEY : null,
    SUBDOMAIN: process.env.RECURLY_SUBDOMAIN ? process.env.RECURLY_SUBDOMAIN : 'schema',
    DEBUG: process.env.RECURLY_DEBUG ? process.env.RECURLY_DEBUG : false
};
var recurly = new Recurly(recurlyConfig);

module.exports.create = function(req, res) {

    var userId = req.user;

    // Create Recurly user based on Arrays' user info

    User.findById(userId)
        .populate('_team')
        .populate('defaultLoginTeam')
        .exec(function (err, user) {
            if (err) {
                res.status(500).send(err);
            } else {

                if (!user.defaultLoginTeam || user._team.length === 0) {
                    return res.status(401).send({error: 'unauthorized'});
                }

                if (!user.isSuperAdmin() && !user.defaultLoginTeam.admin && user.defaultLoginTeam.admin != userId) {
                    return res.status(401).send({error: 'unauthorized'});
                }

                recurly.accounts.create({
                    account_code: user.defaultLoginTeam._id.toString(), // *required
                    email: user.email,
                    first_name: user.firstName,
                    last_name: user.lastName

                }, function(err, response) {

                    if (err) {
                        res.status(err.statusCode).send(err);
                    } else {
                        res.status(response.statusCode).json(response);
                    }
                });
            }
        });
};

module.exports.get = function(req, res) {

    var userId = req.user;

    User.findById(userId)
        .populate('_team')
        .populate('defaultLoginTeam')
        .exec(function (err, user) {
            if (err) {
                res.status(500).send(err);
            } else {
                
                if (!user) {
                    return res.status(401).send({error: 'unauthorized'});
                }

                if (!user.defaultLoginTeam || user._team.length === 0) {
                    return res.status(401).send({error: 'unauthorized'});
                }

                if (!user.isSuperAdmin() && !user.defaultLoginTeam.admin && user.defaultLoginTeam.admin != userId) {
                    return res.status(401).send({error: 'unauthorized'});
                }

                recurly.accounts.get(user.defaultLoginTeam._id.toString(), function(err, response) {
                    if (err) {
                        res.status(err.statusCode).send(err);
                    } else {
                        res.status(response.statusCode).json(response);
                    }
                });
            }
        });
};
