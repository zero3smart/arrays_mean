var User = require('../../models/users');

module.exports.index = function (req, next) {
    var self = this;

    var data = {
        env: process.env,

        flash: req.flash('message'),

        user: req.user
    };

    next(null, data);
};



module.exports.search = function(req,res) {

	User.find(req.body,function(err,foundUsers) {
		if (err) {
			res.send(err);
		} else {
			res.json(foundUsers);
		}

	})
}