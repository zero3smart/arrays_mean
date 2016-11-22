var nodemailer = require('nodemailer');
var jwt = require('jsonwebtoken');
var jwtSecret = process.env.SESSION_SECRET;
var host = process.env.HOST || 'localhost';
var port = process.env.PORT || 9080;
var url = "http://" + host + ":" + port

// ToDo: switching out gmail service to Amazon SES
var transporter = nodemailer.createTransport({
	transport: 'ses',
	accessKeyId: process.env.AWS_ACCESS_KEY_ID,
	secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
	rateLimit: 5,
	region: process.env.AWS_DEFAULT_REGION
});

function sendEmail (mailOptions,callback) {
	transporter.sendMail(mailOptions,function(err,info) {
		if (err) console.log(err);
		console.log(info)
		callback(err);
	})
}

module.exports.sendActivationEmail = function(user,cb) {
	var token = jwt.sign({
		_id: user._id,
		email: user.email
	},jwtSecret,{expiresIn:'1m'});
	var activationLink = url + '/account/verify?token=' + token;
	var mailOptions = {
		from: 'info@arrays.co',
		to: user.email,
		subject: 'Welcome To Arrays!',
		html: 'Hi ' + user.firstName + ", <br> Thank you for signing up with us ! Your account has been created, please use the following link to activate it: <br> " + 
		activationLink + "<br> This link will expire in two hours. <br><br><br> Sincerely, <br>The Arrays Team"

	}
	sendEmail(mailOptions,function(err) {
		cb(err);
	})
}


module.exports.sendInvitationEmail = function(admin,invite,cb) {

}


