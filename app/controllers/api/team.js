var Team = require('../../models/teams');
var User = require('../../models/users')
var ImageHosting = require('../../libs/utils/aws-image-hosting');

module.exports.search = function(req,res) {
	Team.find(req.query,function(err,foundTeams) {
		if (err) {
			res.send(err);
		} else {
			res.json(foundTeams);
		}

	})
}


module.exports.loadIcons = function(req,res) {
	if (req.user) {
		User.findById(req.user)
		.populate('_team')
		.exec(function(err,user) {
			if (err) {
				res.status(500).send({error:err.message});
			} else {
				ImageHosting.getAllIconsForTeam(user._team.subdomain,function(err,data) {
					if (err) {
						res.status(500).send({error:err.message})
					} else {
						res.json({iconsUrl: data});
					}
				})

			}

		})
	} else {
		res.status(401).send('unauthorized');
	}
}

