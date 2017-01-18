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
            res.status(response.statusCode).json(response);
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
            res.status(response.statusCode).json(response);
        }
    });
    
};
