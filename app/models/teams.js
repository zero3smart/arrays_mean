var mongoose_client = require('./mongoose_client');
var integerValidator = require('mongoose-integer');
var _ = require("lodash");
var User = require('./users');
var Team = require('./teams');
var nodemailer = require('.././libs/utils/nodemailer');
var winston = require('winston');
var mongoose = mongoose_client.mongoose;
var Schema = mongoose.Schema;

var team_scheme = Schema({
    title: String,
    subdomain: { type: String, unique: true },
    description: String,
    logo: String,
    logo_header: String,
    superTeam: Boolean,
    admin: { type: Schema.Types.ObjectId, ref: 'User' },
    datasourceDescriptions: [{ type: Schema.Types.ObjectId, ref: 'DatasourceDescription' }],
    subscription: Object
}, { timestamps: true });


var modelName = 'Team';
team_scheme.plugin(integerValidator);


var deepPopulate = require('mongoose-deep-populate')(mongoose);

team_scheme.plugin(deepPopulate, { whitelist: ['datasourceDescriptions.author', 'datasourceDescriptions.updatedBy'] });


team_scheme.pre('save',function(next) {
    this._wasNew = this.isNew;
    next();
})


team_scheme.methods.notifyNewTeamCreation = function() {
   if (this._wasNew) {
        this.populate('admin',function(err,docPopulatedWithAdmin) {
            if (err || !docPopulatedWithAdmin.admin) {
                winston.error('Team created with error');
                console.log(err);
            } else {
                nodemailer.newTeamCreatedEmail(docPopulatedWithAdmin,function(err) {
                    if (err) winston.error('cannot send user alert email');
                    else {
                        winston.info('Team created email sent');
                    }
                })
            }
        })
   }
};


var team = mongoose.model(modelName, team_scheme);

team.GetTeams = function(fn) {
    mongoose_client.WhenMongoDBConnected(function() {
        team.find({}, function(err, teams) {
            if (err) fn(err);
            fn(null, teams);

        });
    });
};

function getTeamsAndPopulateDatasetWithQuery(teamQuery, datasetQuery, fn) {

    team.find(teamQuery)
        .deepPopulate('datasourceDescriptions datasourceDescriptions.updatedBy datasourceDescriptions.author', {
            populate: {
                'datasourceDescriptions': {
                    match: datasetQuery,
                    select: 'description uid urls title importRevision updatedAt updatedBy author brandColor fe_views.default_view fe_filters.default banner connection'
                },
                'datasourceDescriptions.updatedBy': {
                    select: 'firstName lastName'
                },
                'datasourceDescriptions.author': {
                    select: 'firstName lastName'
                }
            }
        })
        .exec(function(err, teams) {
            if (err) fn(err);

            fn(null, teams);
        });
}

// arrays' public page data
team.GetTeamsAndDatasources = function(userId, fn) {


    function nonLoginUserQuery (cb) {
        var publicAndImportedDataset = {isPublic: true,imported:true,fe_visible:true,state:'approved'};
        var publicAndConnectedDataset = {isPublic:true,connection:{$ne:null}, fe_listed:true, fe_visible:true};
        getTeamsAndPopulateDatasetWithQuery({ $or: [ { 'superTeam': true}, { 'subscription.state': 'active' } ] }, {$or: [publicAndImportedDataset,publicAndConnectedDataset]}, cb);
    }

    if (userId) {
        User.findById(userId)
            .populate('_team')
            .populate('defaultLoginTeam')
            .exec(function(err, foundUser) {
                if (err) return fn(err);
                if (!foundUser) return nonLoginUserQuery(fn);
                var importedDataset = {imported:true,fe_visible:true,state: 'approved'};
                var connectedDataset = {connection:{$ne:null}, fe_listed:true,fe_visible:true};

                if (foundUser.isSuperAdmin()) {
                    getTeamsAndPopulateDatasetWithQuery({}, {$or:[importedDataset,connectedDataset] } , fn);

                } else if (foundUser.defaultLoginTeam.admin == userId) {
                    var myTeamId = foundUser.defaultLoginTeam._id;
                    var otherTeams = { _team: { $ne: myTeamId }, isPublic: true};
                    var myTeam = { _team: foundUser.defaultLoginTeam._id };


                    getTeamsAndPopulateDatasetWithQuery({ $or: [ { 'superTeam': true }, { 'subscription.state': 'active' } ] },
                     { $and: [{ $or: [myTeam, otherTeams] },
                     {$or:[importedDataset,connectedDataset] } ] },
                     fn);



                } else { //get published and unpublished dataset if currentUser is one of the viewers or editiors
                    var myTeamId = foundUser.defaultLoginTeam._id;
                    var otherTeams = { _team: { $ne: myTeamId }, isPublic: true};


                    var myTeam = {_team: foundUser.defaultLoginTeam._id, $or: [{ _id: {$in: foundUser._editors} }, {_id: { $in: foundUser._viewers} }] }
                    getTeamsAndPopulateDatasetWithQuery({ $or: [ { 'superTeam': true }, { 'subscription.state': 'active' } ] }, { $and: [{ $or: [myTeam, otherTeams] }, {$or:[importedDataset,connectedDataset] } ] }, fn);


                }
            });

    } else {

        nonLoginUserQuery(fn);

    }

};

//team page
team.GetTeamBySubdomain = function(req, fn) {

    var subdomains = req.subdomains;

    var team_key = subdomains[0];


    if (team_key === null || typeof team_key === 'undefined' || team_key === "") {
        return fn(new Error('No SubDomain Asked!'));
    }

    var userId = req.user;
    var userIsPartOfThisTeam;

    function getPublishedDataset (cb) {
        var publishedImportedDataset = {isPublic:true,imported:true,fe_listed:true,fe_visible:true,
            'fe_views.views': {$exists:true}, 'fe_views.default_view': {$exists: true}};
        var publishedConnectedDataset = {isPublic:true,fe_listed:true,fe_visible:true};
        getTeamsAndPopulateDatasetWithQuery({ subdomain: team_key, $or: [ { 'superTeam': true },
         { 'subscription.state': 'active' } ] }, {$or: [publishedImportedDataset,publishedConnectedDataset]},
          cb);
    }

    if (userId) {

        User.findById(userId)
            .populate('_team')
            .populate('defaultLoginTeam')
            .exec(function(err, foundUser) {
                for (var i = 0; i < foundUser._team.length; i++) {
                    if (team_key === foundUser._team[i].subdomain) {
                        userIsPartOfThisTeam = true;
                        break;
                    }
                    userIsPartOfThisTeam = false;
                }
                var importedDataset = {imported: true, 'fe_views.views': {$exists:true}, 'fe_views.default_view': {$exists: true}};
                var connectedDataset = {imported: true, connection: {$ne: null}};


                if (err) return fn(err);
                if (foundUser.isSuperAdmin()) {
                    getTeamsAndPopulateDatasetWithQuery({ subdomain: team_key }, {$or:[connectedDataset,importedDataset] } , fn);

                } else if (foundUser.defaultLoginTeam.admin == userId) {
                    var myTeamId = foundUser.defaultLoginTeam._id;

                    var myTeam = { _team: foundUser.defaultLoginTeam._id };


                    getTeamsAndPopulateDatasetWithQuery({ subdomain: team_key, $or: [ { 'superTeam': true }, { 'subscription.state': 'active' } ] },
                        { $and: [myTeam, {$or:[connectedDataset,importedDataset] }     ] }, fn);



                } else if (userIsPartOfThisTeam) { //get published and unpublished dataset if currentUser is one of the viewers
                    var myTeamId = foundUser.defaultLoginTeam._id;

                    var myTeam = { $or: [{ _id: { $in: foundUser._editors } }, { _id: { $in: foundUser._viewers } }] };


                    getTeamsAndPopulateDatasetWithQuery({ subdomain: team_key, $or: [ { 'superTeam' : true },
                        { 'subscription.state': 'active' } ] },
                        { $and: [myTeam, {$or:[connectedDataset,importedDataset]}] }, fn);
                } else { // get published dataset if currentUser is not one of the viewers
                    getPublishedDataset(fn);

                }
            });

    } else { //get published datasets

       getPublishedDataset(fn);
    }

};


//Update Subscription info from data returned from Recurly API
team.UpdateSubscription = function(userId, responseData, callback) {
    User.findById(userId)
        .populate('_team')
        .populate('defaultLoginTeam')
        .exec(function(err, user) {
            if (err) {
                return callback(500, err);
            } else {

                // If user doesn't have a team
                if (!user.defaultLoginTeam || user._team.length === 0) {
                    return callback(401, 'unauthorized');
                }

                // If user is not superAdmin or team admin
                if (!user.isSuperAdmin() && !user.defaultLoginTeam.admin && user.defaultLoginTeam.admin != userId) {
                    return callback(401, 'unauthorized');
                }

                var stateChangedTo = '';

                // Update team with subscription info
                team.findByIdAndUpdate(user.defaultLoginTeam._id)
                    .exec(function(err, team) {
                        if (err) {
                            return callback(500, err);
                        } else if (!team) {
                            return callback(404, 'Team not found');
                        } else {

                            if (responseData.data.subscription) {

                                var subscription = responseData.data.subscription;

                                if (team.subscription) {
                                    if (team.subscription.state == 'active' && subscription.state == 'canceled') {

                                        stateChangedTo = 'canceled';
                                    } else if (team.subscription.state == 'canceled' && subscription.state == 'active') {
                                        stateChangedTo = 'active';
                                    }

                                }




                                team.subscription = {
                                    activated_at: subscription.activated_at._,
                                    canceled_at: subscription.canceled_at._,
                                    current_period_ends_at: subscription.current_period_ends_at._,
                                    current_period_started_at: subscription.current_period_started_at._,
                                    expires_at: subscription.expires_at._,
                                    plan: {
                                        name: subscription.plan.name,
                                        plan_code: subscription.plan.plan_code
                                    },
                                    quantity: subscription.quantity._,
                                    remaining_billing_cycles: subscription.remaining_billing_cycles._,
                                    state: subscription.state,
                                    total_billing_cycles: subscription.total_billing_cycles._,
                                    trial_days_left: subscription.trial_days_left,
                                    trial_ends_at: subscription.trial_ends_at._,
                                    trial_started_at: subscription.trial_started_at._,
                                    uuid: subscription.uuid

                                };

                            } else {
                                team.subscription = {};
                            }

                            team.save(function(err) {
                                if (err) {
                                    return callback(500, err);
                                } else {
                                    if (stateChangedTo !== '') {
                                        nodemailer.subscriptionUpdatedEmail(user,user.defaultLoginTeam,stateChangedTo,function(err) {
                                            if (err) winston.error('cannot send user alert email');
                                            else {
                                                winston.info('send user alert email with subscription update');
                                            }

                                        })
                                    }
                                    return callback(responseData.statusCode, null, responseData);
                                }
                            });
                        }
                    });
            }
        });
};

module.exports = team;
