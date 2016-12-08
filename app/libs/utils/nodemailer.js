var nodemailer = require('nodemailer');
var jwt = require('jsonwebtoken');
var jwtSecret = process.env.SESSION_SECRET;

var transporter = nodemailer.createTransport({
	transport: 'ses',
	accessKeyId: process.env.AWS_ACCESS_KEY_ID,
	secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
	rateLimit: 5,
	region: process.env.AWS_REGION
});

function sendEmail (mailOptions,callback) {
	transporter.sendMail(mailOptions,function(err,info) {
		if (err) console.log(err);
		console.log(info);
		callback(err);
	})
}

module.exports.sendActivationEmail = function(user, cb) {
	var token = jwt.sign({
		_id: user._id,
		email: user.email
	},jwtSecret,{expiresIn:'2h'});

    var baseURL = process.env.USE_SSL === 'true' ? 'https://' : 'http://';
    baseURL += process.env.HOST ? process.env.HOST : 'localhost:9080';

    var activationLink = baseURL + '/account/verify?token=' + token;
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


module.exports.sendInvitationEmail = function(admin,invite,role,datasets,cb) {
	var token = jwt.sign({
		_id: invite._id,
		email: invite.email,
		role: role,
		dataset: datasets
	},jwtSecret,{expiresIn:'2h'});

	var baseURL = process.env.USE_SSL === 'true' ? 'https://' : 'http://';
    baseURL += process.env.HOST ? process.env.HOST : 'localhost:9080';

    var invitationLink = baseURL + '/account/invitation?token=' + token;
    var mailOptions = {
    	from: 'info@arrays.co',
    	to: invite.email,
    	subject: 'Invitation from ' + admin.firstName + " " + admin.lastName,
    	html: 'Hi! <br>This is a notice that ' + admin.firstName + " " + admin.lastName + " from team " +
    	admin._team.title + " invited you to join their projects. <br> Please use the" + 
    	" following link to accept the invitation: <a href='" + invitationLink + "'> here</a><br><br> Sincerely, <br> The Arrays Team"

    }
    sendEmail(mailOptions,function(err) {
    	console.log(err);
    	cb(err);

    })

}


