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

var br = '<br>';
var brbr = br + br;
var emailFooter =
    'Arrays Software, LLC' + br +
    'info@arrays.co' + brbr +
    '<a href="https://www.facebook.com/arraysapp/">Facebook</a> | ' +
    '<a href="https://www.twitter.com/arraysapp/">Twitter</a> | ' +
    '<a href="https://www.instagram.com/arraysapp/">Instagram</a>';


/**
 * Emails to users
 */
function sendEmail (mailOptions,callback) {
    transporter.sendMail(mailOptions,function(err,info) {
        if (err) console.log(err);
        console.log(info);
        if (callback) callback(err);
    });
}

module.exports.sendVizFinishProcessingEmail = function(user,dataset,team,cb) {
    var default_view = dataset.fe_views.default_view;

    var datasetTitle = dataset.title;
    var datasetUID = dataset.uid;
    var datasetRevision = dataset.revision;

    if (dataset.schema_id && !(datasetTitle || datasetUID || datasetRevision)) {
        datasetTitle = dataset.schema_id.title;
        datasetUID = dataset.schema_id.uid;
        datasetRevision = dataset.schema_id.importRevision;
        default_view = dataset.schema_id.fe_views.default_view;
    }

    var link = process.env.USE_SSL === 'true' ? 'https://' : 'http://';
    link += team.subdomain + '.' + rootDomain + '/' + datasetUID + '-r' + datasetRevision + '/' + default_view;

    var mailOptions = {
        from : 'info@arrays.co',
        to: user.email,
        subject: 'Visualization Import Finished!',
        html:
            user.firstName + ',' + brbr +
            'Your visualization, "' + datasetTitle + '" has finished importing.' + brbr +
            'Use the following link to view your visualization:' + brbr +
            '<a href="' + link + '">' + link + '</a>' + brbr +
            emailFooter
    };

    sendEmail(mailOptions,cb);
};

module.exports.sendResetPasswordEmail = function(user,cb) {
    var token = jwt.sign({
        _id: user._id,
        email: user.email
    },jwtSecret,{expiresIn: '24h'});

    var link = baseURL + '/account/reset_password?token=' + token;
    var mailOptions = {
        from : 'info@arrays.co',
        to: user.email,
        subject: 'Account Password Reset',
        html:
            user.firstName + ',' + brbr +
            'Use the following link to reset your Arrays account password:' + brbr +
            '<a href="' + link + '">' + link + '</a>' + brbr +
            'This link will expire in twenty-four hours.' + brbr +
            emailFooter
    };

    sendEmail(mailOptions,function(err) {
        console.log(err);
        cb(err);
    });
};

module.exports.sendActivationEmail = function(user, cb) {
    var token = jwt.sign({
        _id: user._id,
        email: user.email
    },jwtSecret,{expiresIn:'2h'});

    var link = baseURL + '/account/verify?token=' + token;
    var mailOptions = {
        from: 'info@arrays.co',
        to: user.email,
        subject: 'Welcome To Arrays!',
        html:
            user.firstName + ',' + brbr +
            'Thank you creating an account on Arrays!' + brbr +
            'Use the following link to activate your account:' + brbr +
            '<a href="' + link + '">' + link + '</a>' + brbr +
            'This link will expire in two hours.' + brbr +
            emailFooter
    };

    sendEmail(mailOptions,function(err) {
        console.log(err);
        cb(err);
    });
};

module.exports.sendInvitationEmail = function(team,host,invitee,editors,viewers,cb) {
    var token = jwt.sign({
        _id: invitee._id,
        email: invitee.email,
        _editors: editors,
        _viewers: viewers,
        host: host._id
    },jwtSecret,{expiresIn:'2h'});

    var link = baseURL + '/account/invitation?token=' + token;
    var mailOptions = {
        from: 'info@arrays.co',
        to: invitee.email,
        subject: 'Invitation to Join \'' + team.title + '\' on Arrays',
        html:
            'The admin of <b>' + team.title + '</b> has invited you to join their team on Arrays.' + brbr +
            'Use the following link to accept their invitation:' + brbr +
            '<a href="' + link + '">' + link + '</a>' + brbr +
            'This link will expire in two hours.' + brbr +
            emailFooter
    };

    sendEmail(mailOptions,function(err) {
        console.log(err);
        cb(err);
    });
};

/** Update user on visualization display status */
function sendVizDisplayStatusUpdate(state,authorName,authorEmail,datasetTitle,cb) {
    var sub = '[Dataset Display Status]: ' + state;
    var mailOptions = {
        from: 'info@arrays.co',
        to: authorEmail,
        subject: sub,
        html:
            authorName + ',' + brbr +
            'Your visualization "' + datasetTitle +
            '" has been ' + state + ' for listing on Arrays.'
    };

    sendEmail(mailOptions,cb);
}

module.exports.notifyVizApprovalAction = function(viz,cb) {
    var authorName = viz.author.firstName + ' ' + viz.author.lastName ;
    sendVizDisplayStatusUpdate(viz.state,authorName, viz.author.email,viz.title,cb);
};


/**
 * User Alert Emails
 * For Arrays team notifications about user activity
 */
function sendUserAlertEmail(teamName,subdomain,userName,userEmail,DateTime,Action,cb) {
    var htmlText =
        'Team Name: ' + teamName + '<br>Subdomain: ' + subdomain +
        '<br>Action User Name: ' + userName + '<br>Action User Email: ' + userEmail +
        '<br>DateTime: ' + DateTime + '<br>Action: ' + Action;
    var mailOptions = {
        from: 'info@arrays.co',
        to: alert_email,
        subject: '[User Alert] ' + Action,
        html: htmlText
    };

    sendEmail(mailOptions,cb);
}

module.exports.newTeamCreatedEmail = function(team,cb) {
    var userName = team.admin.firstName + ' ' + team.admin.lastName;
    var subject = 'Team Created (id: ' + team._id + ')';
    sendUserAlertEmail(team.title,team.subdomain,userName,team.admin.email,team.createdAt,subject, cb);
};

module.exports.newVizCreatedEmail = function(viz,cb) {
    var userName = viz.author.firstName + ' ' + viz.author.lastName;
    var subject = 'Viz Created (id: ' + viz._id + ', title: ' + viz.title + ')';
    sendUserAlertEmail(viz._team.title,viz._team.subdomain,userName,viz.author.email,viz.createdAt,subject,cb);
};

// this should be sending to email other than useralerts , since it requires actions
module.exports.newVizWaitingForApproval = function(viz,cb) {
    var userName = viz.author.firstName + ' ' + viz.author.lastName;
    var subject = 'Viz pending approval (id: ' + viz._id + ', title: ' + viz.title + ')';
    sendUserAlertEmail(viz._team.title,viz._team.subdomain,userName, viz.author.email,viz.updatedAt,subject,cb);
};

module.exports.newUserInvitedEmail = function(admin,team,user,cb) {
    var userName = admin.firstName + ' ' +  admin.lastName;
    var subject = 'Invited  New User (id: ' + user._id + ', email: ' + user.email + ')';
    sendUserAlertEmail(team.title,team.subdomain,userName, admin.email, user.createdAt,subject,cb);
};

module.exports.newUserAcceptedInvitationEmail = function(team,user,cb) {
    var userName = user.firstName + ' ' + user.lastName;
    var subject = 'User Accepted Invitation';
    sendUserAlertEmail(team.title,team.subdomain,userName,user.email, user.updatedAt,subject,cb);
};

module.exports.subscriptionUpdatedEmail = function(admin,team,subscriptionAction,cb) {
    var userName = admin.firstName + ' ' + admin.lastName;
    var subject = 'Subscription State Changed To "' + subscriptionAction + '"';
    sendUserAlertEmail(team.title,team.subdomain,userName,admin.email,team.updatedAt,subject,cb);
};
