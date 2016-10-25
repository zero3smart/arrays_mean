var request = require("request");

module.exports.index = function (req, next) {
    var self = this;

    var data = {
        env: process.env,

        flash: req.flash('message'),

        user: req.user
    };

    next(null, data);
};

module.exports.update = function (req, next) {

    var body = {
        user_metadata: {
            name: {
                givenName: req.body.givenName,
                familyName: req.body.familyName
            }
        }
    };

    if (req.body.password.length) {
        body.password = req.body.password;
    }

    var options = {
        method: 'PATCH',
        url: 'https://' + process.env.AUTH0_DOMAIN + '/api/v2/users/' + req.user.id,
        headers: {
            'content-type': 'application/json',
            authorization: 'Bearer ' + process.env.AUTH0_MANAGEMENT_TOKEN
        },
        body: body,
        json: true
    };

    request(options, function (error, response, body) {

        // console.log(body);

        next(error);
    });

};
