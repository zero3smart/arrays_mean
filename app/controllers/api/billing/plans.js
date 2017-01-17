var User = require('../../../models/users');

var Recurly = require('node-recurly');
var recurlyConfig = {
    API_KEY: process.env.RECURLY_API_KEY ? process.env.RECURLY_API_KEY : null,
    SUBDOMAIN: process.env.RECURLY_SUBDOMAIN ? process.env.RECURLY_SUBDOMAIN : 'schema',
    DEBUG: process.env.RECURLY_DEBUG ? process.env.RECURLY_DEBUG : false
};
var recurly = new Recurly(recurlyConfig);

module.exports.get = function(req, res) {

    var plan_code = req.params.plan_code;

    recurly.plans.get(plan_code, function(err, response) {
        if (err) {
            res.status(err.statusCode).send(err);
        } else {
            res.status(response.statusCode).json(response);
        }
    });
};
