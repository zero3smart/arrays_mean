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


var alert_email = process.env.ALERT_EMAIL || 'useralerts@arrays.co';

var rootDomain = process.env.HOST ? process.env.HOST : 'localhost:9080';

var baseURL = process.env.USE_SSL === 'true' ? 'https://' : 'http://';

baseURL += process.env.NODE_ENV == 'enterprise' ? rootDomain : 'app.' + rootDomain;





function sendEmail (mailOptions,callback) {
	transporter.sendMail(mailOptions,function(err,info) {
		if (err) console.log(err);
		console.log(info);
		if (callback) callback(err);
	})
}



function sendUserAlertEmail(teamName,subdomain,userName,userEmail,DateTime,Action,cb) {
	var htmlText = 'Team Name: ' + teamName + '<br>Subdomain: ' + subdomain + '<br>Action User Name: ' + 
	userName + '<br>Action User Email: ' + userEmail + '<br>DateTime: ' + DateTime + '<br>Action: ' + 
	Action;
	var mailOptions = {
		from: 'info@arrays.co',
		to: alert_email,
		subject: '[User Alert] ' + Action,
		html: htmlText
	}

	sendEmail(mailOptions,cb);

}

function sendVizDisplayStatusUpdate(state,authorName,authorEmail,datasetTitle,cb) {
	var sub = '[Dataset Display Status]: ' + state;
	var htmlText = 'Hi, ' + authorName + '<br>Your dataset (title:' + datasetTitle + ') is ' + state + ' to be listed on arrays.co.';
	var mailOptions = {
		from: 'info@arrays.co', 
		to: authorEmail,
		subject: sub,
		html: htmlText
	}

	sendEmail(mailOptions,cb);
}

module.exports.sendResetPasswordEmail = function(user,cb) {
	var token = jwt.sign({
		_id: user._id,
		email: user.email
	},jwtSecret,{expiresIn: '24h'});

	var resetLink = baseURL + '/account/reset_password?token=' + token;
	var mailOptions = {
		from : 'info@arrays.co',
		to: user.email,
		subject: 'Account Password Reset',
		html: "Hi " + user.firstName + ",<br> To reset the password of your Arrays account, please click the link below: <br>"	+ 
		resetLink + "<br>"
	}
	sendEmail(mailOptions,function(err) {
		console.log(err);
		cb(err);
	})
}


module.exports.sendActivationEmail = function(user, cb) {
	var token = jwt.sign({
		_id: user._id,
		email: user.email
	},jwtSecret,{expiresIn:'2h'});



    var activationLink = baseURL + '/account/verify?token=' + token;
	var mailOptions = {
		from: 'info@arrays.co',
		to: user.email,
		subject: 'Welcome To Arrays!',
		html: 'Hi ' + user.firstName + ", <br> Thank you for signing up with us ! Your account has been created, please" + 
		" activate your account using the following link: <a href='" + activationLink+ "'>here</a><br> This link will expire in two hours. <br><br><br> Sincerely, <br>The Arrays Team"

	}
	sendEmail(mailOptions,function(err) {
		console.log(err);
		cb(err);
	})
}

module.exports.newTeamCreatedEmail = function(team,cb) {

	var userName = team.admin.firstName + ' ' + team.admin.lastName

	var subject = 'Team Created (id: ' + team._id + ')';

	sendUserAlertEmail(team.title,team.subdomain,userName,team.admin.email,team.createdAt,
		subject, cb);
}


module.exports.newVizCreatedEmail = function(viz,cb) {

	if (process.env.NODE_ENV !== 'development') {
		var userName = viz.author.firstName + ' ' + viz.author.lastName;
		var subject = 'Viz Created (id: ' + viz._id + ', title: ' + viz.title + ')';
		sendUserAlertEmail(viz._team.title,viz._team.subdomain,userName,viz.author.email,viz.createdAt,
			subject,cb);
	}
	
}

// this should be sending to email other than useralerts , since it requires actions
module.exports.newVizWaitingForApproval = function(viz,cb) {
	var userName = viz.author.firstName + ' ' + viz.author.lastName;
	var subject = 'Viz pending approval (id: ' + viz._id + ', title: ' + viz.title + ')';
	sendUserAlertEmail(viz._team.title,viz._team.subdomain,userName, viz.author.email,viz.updatedAt,
		subject,cb);
}

module.exports.notifyVizApprovalAction = function(viz,cb) {
	var authorName = viz.author.firstName + ' ' + viz.author.lastName ;
	sendVizDisplayStatusUpdate(viz.state,authorName, viz.author.email,viz.title,cb);
}

module.exports.newUserInvitedEmail = function(admin,team,user,cb) {

	var userName = admin.firstName + ' ' +  admin.lastName;
	var subject = 'Invited  New User (id: ' + user._id + ', email: ' + user.email + ')';
	sendUserAlertEmail(team.title,team.subdomain,userName, admin.email, user.createdAt,subject,cb);
}

module.exports.newUserAcceptedInvitationEmail = function(team,user,cb) {
	var userName = user.firstName + ' ' + user.lastName;
	var subject = 'User Accepted Invitation';
	sendUserAlertEmail(team.title,team.subdomain,userName,user.email, user.updatedAt,subject,cb);

}

module.exports.subscriptionUpdatedEmail = function(admin,team,subscriptionAction,cb) {
	var userName = admin.firstName + ' ' + admin.lastName;
	var subject = 'Subscription State Changed To "' + subscriptionAction + '"'
	sendUserAlertEmail(team.title,team.subdomain,userName,admin.email,team.updatedAt,subject,cb);

}



module.exports.sendInvitationEmail = function(team,host,invitee,editors,viewers,cb) {
	var token = jwt.sign({
		_id: invitee._id,
		email: invitee.email,
		_editors: editors,
		_viewers: viewers,
		host: host._id
	},jwtSecret,{expiresIn:'2h'});


    var invitationLink = baseURL + '/account/invitation?token=' + token;
    var mailOptions = {
    	from: 'info@arrays.co',
    	to: invitee.email,
    	subject: 'Invitation from Team ' + team.title,
    	html: 'Hi! <br>This is a notice that the admin of the team ' +
    	team.title + " invited you to join their projects. <br> Please use the" + 
    	" following link to accept the invitation: <a href='" + invitationLink + "'> here</a><br><br> Sincerely, <br> The Arrays Team"
    }
    sendEmail(mailOptions,function(err) {
    	console.log(err);
    	cb(err);

    })

}


