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

                recurly.billingInfo.create(user.defaultLoginTeam._id.toString(), {

                    // Either submit required Credit Card fields or Bank Account fields to create the corresponding account

                    // Credit Card
                    first_name: req.body.first_name, // *required
                    last_name: req.body.last_name,   // *required
                    number: req.body.number,         // *required
                    month: req.body.month,           // *required
                    year: req.body.year,             // *required

                    verification_value: req.body.verification_value, // CVV code on card

                    // Bank Account
                    name_on_account: req.body.name_on_account, // *required
                    routing_number: req.body.routing_number,   // *required
                    account_number: req.body.account_number,   // *required
                    account_type: req.body.account_type,       // *required - checking or savings

                    address1: req.body.address1,     // Can't be empty
                    address2: req.body.address2,
                    city: req.body.city,             // Can't be empty
                    state: req.body.state,           // Can't be empty
                    country: req.body.country,       // Can't be empty
                    zip: req.body.zip,               // Can't be empty
                    phone: req.body.phone,

                    ip_address: req.body.ip_address

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

                if (!user.defaultLoginTeam || user._team.length === 0) {
                    return res.status(401).send({error: 'unauthorized'});
                }

                if (!user.isSuperAdmin() && !user.defaultLoginTeam.admin && user.defaultLoginTeam.admin != userId) {
                    return res.status(401).send({error: 'unauthorized'});
                }

                recurly.billingInfo.get(user.defaultLoginTeam._id.toString(), function(err, response) {
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

                if (req.body.payment_type === 'credit_card') {
                    
                    recurly.billingInfo.update(user.defaultLoginTeam._id.toString(), {

                        // Either submit required Credit Card fields or Bank Account fields to create the corresponding account

                        // Credit Card
                        first_name: req.body.first_name, // *required
                        last_name: req.body.last_name,   // *required
                        number: req.body.number,         // *required
                        month: req.body.month,           // *required
                        year: req.body.year,             // *required

                        verification_value: req.body.verification_value, // CVV code on card

                        address1: req.body.address1,     // Can't be empty
                        address2: req.body.address2,
                        city: req.body.city,             // Can't be empty
                        state: req.body.state,           // Can't be empty
                        country: req.body.country,       // Can't be empty
                        zip: req.body.zip,               // Can't be empty
                        phone: req.body.phone,

                        ip_address: req.body.ip_address

                    }, function(err, response) {
                        if (err) {
                            res.status(err.statusCode).send(err);
                        } else {
                            res.status(response.statusCode).json(response);
                        }
                    });

                } else if (req.body.payment_type === 'bank_account') {

                    recurly.billingInfo.update(user.defaultLoginTeam._id.toString(), {

                        // Bank Account
                        name_on_account: req.body.name_on_account, // *required
                        routing_number: req.body.routing_number,   // *required
                        account_number: req.body.account_number,   // *required
                        account_type: req.body.account_type,       // *required - checking or savings

                        address1: req.body.address1,     // Can't be empty
                        address2: req.body.address2,
                        city: req.body.city,             // Can't be empty
                        state: req.body.state,           // Can't be empty
                        country: req.body.country,       // Can't be empty
                        zip: req.body.zip,               // Can't be empty
                        phone: req.body.phone,

                        ip_address: req.body.ip_address

                    }, function(err, response) {
                        if (err) {
                            res.status(err.statusCode).send(err);
                        } else {
                            res.status(response.statusCode).json(response);
                        }
                    });
                }
            }
        });
};
