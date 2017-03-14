var Team = require('../../../models/teams');
var User = require('../../../models/users');

var Recurly = require('node-recurly');
var recurlyConfig = {
    API_KEY: process.env.RECURLY_API_KEY ? process.env.RECURLY_API_KEY : null,
    SUBDOMAIN: process.env.RECURLY_SUBDOMAIN ? process.env.RECURLY_SUBDOMAIN : 'schema',
    DEBUG: process.env.RECURLY_DEBUG ? process.env.RECURLY_DEBUG : false
};
var recurly = new Recurly(recurlyConfig);

var moment = require('moment');

module.exports.create = function(req, res) {

    var userId = req.user;

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

                var trial_ends_at = moment().toISOString();

                recurly.subscriptions.create({
                    plan_code: req.body.plan_code, // *required
                    account: {
                        account_code: user.defaultLoginTeam._id.toString()  // *required
                    },
                    quantity: req.body.quantity,
                    currency: 'USD',                // *required
                    trial_ends_at: req.body.skipTrial ? trial_ends_at : undefined

                }, function(err, response) {
                    if (err) {
                        res.status(err.statusCode).send(err);
                    } else {
                        Team.UpdateSubscription(userId, response, function(status, err, response) {
                            if (err) {
                                res.status(status).send(err);
                            } else {
                                res.status(status).send(response);
                            }
                        });
                    }
                });
            }
        });
    
};

module.exports.getAll = function(req, res) {

    var userId = req.user;

    User.findById(userId)
        .populate('_team')
        .populate('defaultLoginTeam')
        .exec(function(err, user) {
            if (err) {
                res.status(500).send(err);
            } else {

                if (!user.defaultLoginTeam || user._team.length === 0) {
                    return res.status(401).send({ error: 'unauthorized' });
                }

                if (!user.isSuperAdmin() && !user.defaultLoginTeam.admin && user.defaultLoginTeam.admin != userId) {
                    return res.status(401).send({ error: 'unauthorized' });
                }

                recurly.subscriptions.listByAccount(user.defaultLoginTeam._id.toString(), {}, function(err, response) {
                    if (err) {
                        res.status(err.statusCode).send(err);
                    } else {
                        res.status(response.statusCode).json(response);
                    }
                });
            }
        });
};

module.exports.update = function(req, res) {

    var userId = req.user;
    var subscrId = req.params.subscrId;
    var options = {};

    if (req.body.plan_code) {
        options = {
            plan_code: req.body.plan_code,
            quantity: req.body.quantity
        };
    } else {
        options = {
            quantity: req.body.quantity
        };
    }

    recurly.subscriptions.update(subscrId, options, function(err, response) {
        if (err) {
            res.status(err.statusCode).send(err);
        } else {
            Team.UpdateSubscription(userId, response, function(status, err, response) {
                if (err) {
                    res.status(status).send(err);
                } else {
                    res.status(status).send(response);
                }
            });
        }
    });

};

module.exports.cancel = function(req, res) {

    var userId = req.user;
    var subscrId = req.params.subscrId;

    recurly.subscriptions.cancel(subscrId, function(err, response) {
        if (err) {
            res.status(err.statusCode).send(err);
        } else {
            Team.UpdateSubscription(userId, response, function(status, err, response) {
                if (err) {
                    res.status(status).send(err);
                } else {
                    res.status(status).send(response);
                }
            });
        }
    });
};

module.exports.reactivate = function(req, res) {

    var userId = req.user;
    var subscrId = req.params.subscrId;

    recurly.subscriptions.reactivate(subscrId, function(err, response) {
        if (err) {
            res.status(err.statusCode).send(err);
        } else {
            Team.UpdateSubscription(userId, response, function(status, err, response) {
                if (err) {
                    res.status(status).send(err);
                } else {
                    res.status(status).send(response);
                }
            });
        }
    });
};
