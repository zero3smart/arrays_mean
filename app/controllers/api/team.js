var Team = require('../../models/teams');

module.exports.search = function(req,res) {
	Team.find(req.query,function(err,foundTeams) {
		if (err) {
			res.send(err);
		} else {
			res.json(foundTeams);
		}

	})
}

