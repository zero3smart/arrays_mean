var User = require('../../models/users');
var Team = require('../../models/teams');
var nodemailer = require('nodemailer');
var jwt = require('jsonwebtoken');
var jwtSecret = process.env.JWT_SECRET




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
	User.find(req.query,function(err,foundUsers) {
		if (err) {
			res.send(err);
		} else {
			res.json(foundUsers);
		}

	})
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
	User.create(req.body,function(err,user) {
		if (err) {
			res.send(err);
		} else {
			res.json(user);
		}
	})
}


function _sendActivationEmail(user,callback) {
	var token = jwt.sign({
		_id: user._id,
		email: user.email,
		exp: 1440
	},jwtSecret);
	var host = process.env.HOST || 'localhost';
	var port = process.env.PORT || 9080;
	var url = "http://" + host + ":" + port + '/verify?token='+token;
	var mailOptions = {
		from : 'nsh1026@uw.edu',
		to: user.email,
		subject: 'Welcome To Arrays!',
		text: 'Thank you for signing up! Your account has been created, please create the link below to activate your account:'+url
	}
	console.log("here");

	transporter.sendMail(mailOptions,function(err,info) {
		if (err) {
			console.log(err);
			callback(err);
		} else {
			console.log(info);
			callback(null);
		}
	})
}




function _sendInvitationEmail(admin,invited,cb) {

}

module.exports.update = function(req,res) {
	var team = req.body._team;
	var teamId = req.body._team._id;
	if (!teamId) { // admin/owner of the team signing up
		team.admin = req.body._id;
		Team.create(team,function(err,createdTeam) {
			if (err) {res.send(err);}
			else {
				teamId = createdTeam._id;
				User.findById(req.body._id,function(err,user) {
					if (err) {
						res.send(err);
					} else if (!user) {
						res.status(404).send('User not found');
					} else {
						if (user.provider == 'local' && req.body.password) {
							user.setPassword(req.body.password);
						} 
						user._team = teamId;
						user.save(function(err,savedUser) {
							if (err) {res.send(err);}
							else {
								console.log("ready to send email");
								_sendActivationEmail(savedUser,function(err) {
									if (err) {
										res.status(500).send('Cannot send activation email');

									} else {
										res.json(savedUser);
									}
								})
							}
						})
					}
				})
			}
		})
	} else { //invited people
		User.findById(req.body._id,function(err,user) {
			if (err) {
				res.send(err);
			} else if (!user) {
				res.status(404).send('User not found');
			} else {
				if (user.provider == 'local' && req.body.password) {
					user.setPassword(req.body.password);
				} 
				user.save(function(err,savedUser) {
					if (err) {res.send(err);}
					else {
						_sendActivationEmail(savedUser,function(err) {
							if (err) {
								res.status(500).send('Cannot send activation email');
							} else {
								res.json(savedUser);
							}
						})
					}
				})
			}
		})



	}

	

}


