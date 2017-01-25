var Team = require('../../../models/teams');
var User = require('../../../models/users');

var Recurly = require('node-recurly');
var recurlyConfig = {
    API_KEY: process.env.RECURLY_API_KEY ? process.env.RECURLY_API_KEY : null,
    SUBDOMAIN: process.env.RECURLY_SUBDOMAIN ? process.env.RECURLY_SUBDOMAIN : 'schema',
    DEBUG: process.env.RECURLY_DEBUG ? process.env.RECURLY_DEBUG : false
};
var recurly = new Recurly(recurlyConfig);

var updateSubscriptionInDB = function(req, res, userId, response) {
    User.findById(userId)
    .populate('defaultLoginTeam')
    .exec(function(err, foundUser) {
        if (foundUser.defaultLoginTeam.admin == userId) {

            Team.findByIdAndUpdate(foundUser.defaultLoginTeam._id)
                .exec(function (err, team) {
                    if (err) {
                        return res.status(500).send(err);
                    } else if (!team) {
                        return res.status(404).send('Team not found.');
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

                        team.save(function (err) {
                            if (err) {
                                res.status(500).send(err);
                            } else {
                                res.status(response.statusCode).json(response);
                            }
                        });
                    }
                });

        } else {
            return res.status(401).send('unauthorized');
        }
    });
};

module.exports.create = function(req, res) {

    var userId = req.user;

    recurly.subscriptions.create({
        plan_code: req.body.plan_code, // *required
        account: {
            account_code: userId       // *required
        },
        currency: 'USD'                // *required

    }, function(err, response) {
        if (err) {
            res.status(err.statusCode).send(err);
        } else {
            updateSubscriptionInDB(req, res, userId, response);
        }
    });
    
};

module.exports.getAll = function(req, res) {

    var userId = req.user;

    recurly.subscriptions.listByAccount(userId, {}, function(err, response) {
        if (err) {
            res.status(err.statusCode).send(err);
        } else {
            res.status(response.statusCode).json(response);
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
            updateSubscriptionInDB(req, res, userId, response);
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
            updateSubscriptionInDB(req, res, userId, response);
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
            updateSubscriptionInDB(req, res, userId, response);
        }
    });
};
