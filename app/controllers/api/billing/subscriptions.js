var Team = require('../../../models/teams');
var User = require('../../../models/users');

var Recurly = require('node-recurly');
var recurlyConfig = {
    API_KEY: process.env.RECURLY_API_KEY ? process.env.RECURLY_API_KEY : null,
    SUBDOMAIN: process.env.RECURLY_SUBDOMAIN ? process.env.RECURLY_SUBDOMAIN : 'schema',
    DEBUG: process.env.RECURLY_DEBUG ? process.env.RECURLY_DEBUG : false
};
var recurly = new Recurly(recurlyConfig);

var updateSubscriptionInDB = function(userId, response, callback) {
    User.findById(userId)
        .populate('_team')
        .populate('defaultLoginTeam')
        .exec(function(err, user) {
            if (err) {
                callback(500, err);
            } else {

                // If user doesn't have a team
                if (!user.defaultLoginTeam || user._team.length === 0) {
                    callback(401, 'unauthorized');
                }

                // If user is not superAdmin or team admin
                if (!user.isSuperAdmin() && !user.defaultLoginTeam.admin && user.defaultLoginTeam.admin != userId) {
                    callback(401, 'unauthorized');
                }

                // Update team with subscription info
                Team.findByIdAndUpdate(user.defaultLoginTeam._id)
                    .exec(function(err, team) {
                        if (err) {
                            callback(500, err);
                        } else if (!team) {
                            callback(404, 'Team not found');
                        } else {

                            var subscription = response.data.subscription;

                            team.subscription = {
                                activated_at: subscription.activated_at._,
                                canceled_at: subscription.canceled_at._,
                                current_period_ends_at: subscription.current_period_ends_at._,
                                current_period_started_at: subscription.current_period_started_at._,
                                expires_at: subscription.expires_at._,
                                plan: {
                                    name: subscription.plan.name,
                                    plan_code: subscription.plan.plan_code
                                },
                                quantity: subscription.quantity._,
                                remaining_billing_cycles: subscription.remaining_billing_cycles._,
                                state: subscription.state,
                                total_billing_cycles: subscription.total_billing_cycles._,
                                trial_days_left: subscription.trial_days_left,
                                trial_ends_at: subscription.trial_ends_at._,
                                trial_started_at: subscription.trial_started_at._,
                                uuid: subscription.uuid

                            };

                            team.save(function(err) {
                                if (err) {
                                    callback(500, err);
                                } else {
                                    callback(response.statusCode, null, response);
                                }
                            });
                        }
                    });
            }
        });
};

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

                recurly.subscriptions.create({
                    plan_code: req.body.plan_code, // *required
                    account: {
                        account_code: user.defaultLoginTeam._id.toString()  // *required
                    },
                    currency: 'USD'                // *required

                }, function(err, response) {
                    if (err) {
                        res.status(err.statusCode).send(err);
                    } else {
                        updateSubscriptionInDB(req, res, userId, response);
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
            updateSubscriptionInDB(userId, response, function(status, err, response) {
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
            updateSubscriptionInDB(userId, response, function(status, err, response) {
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
            updateSubscriptionInDB(userId, response, function(status, err, response) {
                if (err) {
                    res.status(status).send(err);
                } else {
                    res.status(status).send(response);
                }
            });
        }
    });
};
