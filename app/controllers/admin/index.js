module.exports.BindData = function(req, callback) {
	var self = this;

	var data = {
		env: process.env,
		
		user: req.user,
		pageTitle: "Account Settings"
	};

	callback(null, data);
};
