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
        .lean()
        .exec(function (err, user) {
            if (err) {
                res.send(err);
            } else {
                recurly.accounts.create({
                    account_code: userId, // *required
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
