var Team = require('../../models/teams');
var User = require('../../models/users');

//expect: {userId: "String" ,teamTitle: "String" , tid: "String"}
module.exports.create = function(req,res) {
	var userId = req.body.userId;
	User.findById(userId,function(err,foundUser) {
		if (err) {
			res.send(err);
		} else if (!foundUser) {
			res.status(404).send("User not found");

		} else {
			
		}
	})	
}



module.exports.search = function(req,res) {
	Team.find(req.query,function(err,foundTeams) {
		if (err) {
			res.send(err);
		} else {
			res.json(foundTeams);
		}

	})
}






