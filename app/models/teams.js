var mongoose_client = require('./mongoose_client');
var integerValidator = require('mongoose-integer');
var _ = require("lodash")
var User = require('./users');

var mongoose = mongoose_client.mongoose;
var Schema = mongoose.Schema;
//
var team_scheme = Schema({
    title: String,
    subdomain: String, //not changable once set
    description: String,
    logo: String,
    logo_header: String,
    admin: {type: Schema.Types.ObjectId, ref: 'User'},
    datasourceDescriptions: [{type: Schema.Types.ObjectId, ref: 'DatasourceDescription'}]
});


var modelName = 'Team';
team_scheme.plugin(integerValidator);


var deepPopulate = require('mongoose-deep-populate')(mongoose);

team_scheme.plugin(deepPopulate, {whitelist: ['datasourceDescriptions.author', 'datasourceDescriptions.updatedBy']});


var team = mongoose.model(modelName, team_scheme);

team.GetTeams = function (fn) {
    mongoose_client.WhenMongoDBConnected(function () {
        team.find({}, function (err, teams) {
            if (err) fn(err);
            fn(null, teams);

        })
    })
};

function getTeamsAndPopulateDatasetWithQuery(teamQuery, datasetQuery, fn) {
    team.find(teamQuery)
        .deepPopulate('datasourceDescriptions datasourceDescriptions.updatedBy datasourceDescriptions.author', {
            populate: {
                'datasourceDescriptions': {
                    match: datasetQuery,
                    select: 'description uid urls title importRevision updatedBy author brandColor fe_views.default_view fe_filters.default banner'
                },
                'datasourceDescriptions.updatedBy': {
                    select: 'firstName lastName'
                },
                'datasourceDescriptions.author': {
                    select: 'firstName lastName'
                }
            }
        })
        .exec(function (err, teams) {
            if (err) fn(err);
            fn(null, teams);
        })
}

// arrays' public page data
team.GetTeamsAndDatasources = function (userId, fn) {

    if (userId) {
        User.findById(userId)
            .populate('_team')
            .exec(function (err, foundUser) {
                if (err) return fn(err);
                if (foundUser.isSuperAdmin()) {
                    getTeamsAndPopulateDatasetWithQuery({}, {imported: true, fe_visible: true}, fn);

                } else if (foundUser._team.admin == userId) {
                    var myTeamId = foundUser._team._id;
                    var otherTeams = {_team: {$ne: myTeamId}, isPublished: true};
                    var myTeam = {_team: foundUser._team};
                    getTeamsAndPopulateDatasetWithQuery({}, {$and: [{$or: [myTeam, otherTeams]}, {imported: true, fe_visible: true}]}, fn);

                } else { //get published and unpublished dataset if currentUser is one of the viewers
                    var myTeamId = foundUser._team._id;
                    var otherTeams = {_team: {$ne: myTeamId}, isPublished: true};
                    var myTeam = {_team: foundUser._team,  $or: [{viewers: userId}, {editors: userId}]};
                    getTeamsAndPopulateDatasetWithQuery({}, {$and: [{$or: [myTeam, otherTeams]}, {imported: true, fe_visible: true}]}, fn);
                }
            })

    } else {
        getTeamsAndPopulateDatasetWithQuery({}, {isPublished: true, imported: true, fe_visible: true}, fn);
    }

};

team.GetTeamBySubdomain = function (req, fn) {
    var subdomains = req.subdomains;
    if (subdomains.length >= 1) {
        if (process.env.NODE_ENV != 'production' && (subdomains[0] == 'staging' || subdomains[0] == 'local')) {
            subdomains.splice(0, 1);
        }
        subdomains.reverse();
    }

    var team_key = subdomains.join('.');
    if (team_key === null || typeof team_key === 'undefined' || team_key === "") {
        return fn(new Error('No SubDomain Asked!'));
    }

    var userId = req.user;
    if (userId) {
        User.findById(userId)
            .populate('_team')
            .exec(function (err, foundUser) {
                if (err) return fn(err);
                if (foundUser.isSuperAdmin()) {
                    getTeamsAndPopulateDatasetWithQuery({subdomain: team_key}, {imported: true, fe_visible: true}, fn);

                } else if (foundUser._team.admin == userId) {
                    var myTeamId = foundUser._team._id;
                    var otherTeams = {_team: {$ne: myTeamId}, isPublished: true};
                    var myTeam = {_team: foundUser._team};
                    getTeamsAndPopulateDatasetWithQuery({subdomain: team_key}, {$and: [{$or: [myTeam, otherTeams]}, {imported: true, fe_visible: true}]}, fn);

                } else { //get published and unpublished dataset if currentUser is one of the viewers
                    var myTeamId = foundUser._team._id;
                    var otherTeams = {_team: {$ne: myTeamId}, isPublished: true};
                    var myTeam = {_team: foundUser._team, $or: [{viewers: userId}, {editors: userId}]};
                    getTeamsAndPopulateDatasetWithQuery({subdomain: team_key}, {$and: [{$or: [myTeam, otherTeams]}, {imported: true, fe_visible: true}]}, fn);
                }
            })

    } else {
        getTeamsAndPopulateDatasetWithQuery({subdomain: team_key}, {isPublished: true, imported: true}, fn);
    }

};

module.exports = team;