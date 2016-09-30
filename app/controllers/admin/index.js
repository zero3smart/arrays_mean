module.exports.BindData = function(callback) {
	var self = this;

	var data = {
		env: process.env,
		
		message: "Welcome to the admin"
	};

	callback(null, data);
};
