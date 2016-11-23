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
    .populate({
        path: 'datasourceDescriptions',
        match: {isPublished:true},
        select: '_id'
    })
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
        .populate('datasourceDescriptions', null, {fe_visible: true})
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