var request = require("request");

module.exports.updateAccount = function (req, res) {

    res.setHeader('Content-Type', 'application/json');

    // Limit to editing own user account
    if (req.user.id !== req.body.id) {
        winston.error("❌  Detect to update another one's account");

        return res.send(JSON.stringify({
            error: "You are limited to edit your own account"
        }));
    }

    var body = {
        user_metadata: {
            name: {
                givenName: req.body.givenName,
                familyName: req.body.familyName
            }
        }
    };

    if (req.body.password && req.body.password.length) {
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

        if (error) {
            winston.error("❌  Error getting bind data for account update: ", error);

            return res.send(JSON.stringify({
                error: error.message
            }));
        }

        res.send(JSON.stringify({
            message: 'Account settings have been updated.'
        }));
    });

};
