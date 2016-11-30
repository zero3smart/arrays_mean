var mongoose_client = require('./mongoose_client');
var integerValidator = require('mongoose-integer');
var _ = require("lodash")

var mongoose = mongoose_client.mongoose;
var Schema = mongoose.Schema;
//
var team_scheme = Schema({
    title: String,
    subdomain: String,
    description: String,
    logo: String,
    logoHeader: String,
    admin: {type: Schema.Types.ObjectId, ref: 'User'},
    editors: [{type: Schema.Types.ObjectId, ref:'User'}],
    datasourceDescriptions: [{type: Schema.Types.ObjectId, ref: 'DatasourceDescription'}]
});


var modelName = 'Team';
team_scheme.plugin(integerValidator);


var deepPopulate = require('mongoose-deep-populate')(mongoose);

team_scheme.plugin(deepPopulate,{whitelist:['datasourceDescriptions.author','datasourceDescriptions.updatedBy']})


var team = mongoose.model(modelName, team_scheme);

team.GetTeams = function (fn) {
    mongoose_client.WhenMongoDBConnected(function () {
        team.find({}, function (err, teams) {
            if (err) fn(err);
            fn(null, teams);

        })
    })
};


// arrays' public page data
team.GetTeamsAndPublishedDatasources = function(fn) {
    team.find({})
    .deepPopulate('datasourceDescriptions datasourceDescriptions.updatedBy datasourceDescriptions.author', { populate: {
        'datasourceDescriptions' : {
            match: {isPublished:true},
            select: 'description uid urls title importRevision updatedBy author brandColor fe_views.default_view fe_filters.default'
        },
        'datasourceDescriptions.updatedBy' : {
            select: 'firstName lastName'
        },
        'datasourceDescriptions.author' : {
            select: 'firstName lastName'
        }
    }})
    .exec(function(err,teams) {
        if (err) fn(err);
        fn(null,teams);
    })
}

team.GetTeamBySubdomain = function (team_key, fn) {
    team.findOne({subdomain: team_key})
        .exec(function (err, teamDesc) {
            fn(err, teamDesc);
        })
};



team.findOneBySubdomainAndPopulateDatasourceDescription = function (team_key, fn) {

    var obj = null;

    team.findOne({subdomain: team_key})
        .deepPopulate('datasourceDescriptions datasourceDescriptions.updatedBy datasourceDescriptions.author',{
            populate: {
                'datasourceDescriptions' : {
                    match: {fe_visible: true},
                    select: 'description uid urls title importRevision updatedBy author brandColor fe_views.default_view fe_filters.default'
                },
                'datasourceDescriptions.updatedBy' : {
                    select: 'firstName lastName'
                },
                'datasourceDescriptions.author' : {
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