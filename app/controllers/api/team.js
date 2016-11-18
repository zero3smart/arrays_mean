var Team = require('../../models/teams');

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

	consoel.log(req.query);


	// User.find(req.body,function(err,foundUsers) {
	// 	if (err) {
	// 		res.send(err);
	// 	} else {
	// 		res.json(foundUsers);
	// 	}

	// })
}


module.exports.get = function(req,res) {
	var id = req.params.id;
	User.findById(id,function(err,user) {
		if (err) {
			res.send(err);
		} else {
			res.json(user);
		}
	})
} 

module.exports.create = function(req,res) {
	Team.create(req.body,function(err,user) {
		if (err) {
			res.send(err);
		} else {
			res.json(user);
		}
	})
}



