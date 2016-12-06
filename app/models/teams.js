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
    editors: [{type: Schema.Types.ObjectId, ref: 'User'}],
    datasourceDescriptions: [{type: Schema.Types.ObjectId, ref: 'DatasourceDescription'}]
});


var modelName = 'Team';
team_scheme.plugin(integerValidator);


var deepPopulate = require('mongoose-deep-populate')(mongoose);

team_scheme.plugin(deepPopulate, {whitelist: ['datasourceDescriptions.author', 'datasourceDescriptions.updatedBy']})


var team = mongoose.model(modelName, team_scheme);

team.GetTeams = function (fn) {
    mongoose_client.WhenMongoDBConnected(function () {
        team.find({}, function (err, teams) {
            if (err) fn(err);
            fn(null, teams);

        })
    })
};

function getTeamsAndPopulateDatasetWithQuery(query, fn) {
    team.find({})
        .deepPopulate('datasourceDescriptions datasourceDescriptions.updatedBy datasourceDescriptions.author', {
            populate: {
                'datasourceDescriptions': {
                    match: query,
                    select: 'description uid urls title importRevision updatedBy author brandColor fe_views.default_view fe_filters.default'
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
                    getTeamsAndPopulateDatasetWithQuery({imported: true}, fn);

                } else if (foundUser._team.editors.indexOf(userId) >= 0 || foundUser._team.admin == userId) {
                    var myTeamId = foundUser._team._id;
                    var otherTeams = {_team: {$ne: myTeamId}, isPublished: true};
                    var myTeam = {_team: foundUser._team};
                    getTeamsAndPopulateDatasetWithQuery({$and: [{$or: [myTeam, otherTeams]}, {imported: true}]}, fn);

                } else { //get published and unpublished dataset if currentUser is one of the viewers
                    var myTeamId = foundUser._team._id;
                    var otherTeams = {_team: {$ne: myTeamId}, isPublished: true};
                    var myTeam = {_team: foundUser._team, viewers: userId};
                    getTeamsAndPopulateDatasetWithQuery({$and: [{$or: [myTeam, otherTeams]}, {imported: true}]}, fn);
                }
            })

    } else {
        getTeamsAndPopulateDatasetWithQuery({isPublished: true, imported: true}, fn);
    }

};

team.GetTeamBySubdomain = function (team_key, fn) {
    team.findOne({subdomain: team_key})
        .exec(function (err, teamDesc) {
            fn(err, teamDesc);
        })
};


team.findOneBySubdomainAndPopulateDatasourceDescription = function (team_key, fn) {

    var obj = null;

    team.findOne({subdomain: team_key})
        .deepPopulate('datasourceDescriptions datasourceDescriptions.updatedBy datasourceDescriptions.author', {
            populate: {
                'datasourceDescriptions': {
                    match: {fe_visible: true},
                    select: 'description uid urls title importRevision updatedBy author brandColor fe_views.default_view fe_filters.default' +
                    ' banner'
                },
                'datasourceDescriptions.updatedBy': {
                    select: 'firstName lastName'
                },
                'datasourceDescriptions.author': {
                    select: 'firstName lastName'
                }
            }
        })

        .exec(function (err, teamDesc) {
            if (teamDesc) {
                obj = {
                    team: _.omit(teamDesc, 'datasourceDescriptions'),
                    team_dataSourceDescriptions: teamDesc.datasourceDescriptions
                };
            }
            fn(err, obj);
        })

};

module.exports = team;