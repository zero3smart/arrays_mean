var async = require('async');
var queryString = require('querystring');

var dataSourceDescriptions = require('../../../../datasources/descriptions').GetDescriptions();
var teamDescriptions = require('../../../../datasources/teams').GetTeams();
var importedDataPreparation = require('../../../../datasources/utils/imported_data_preparation');
var raw_source_documents = require('../../../../models/raw_source_documents');

module.exports.BindData = function(urlQuery, callback) {
    var self = this;

    var iterateeFn = async.ensureAsync(function(dataSourceDescription, cb) // prevent stack overflows from this sync iteratee
    {
        var err = null;
        var source_pKey = importedDataPreparation.DataSourcePKeyFromDataSourceDescription(dataSourceDescription);
        raw_source_documents.Model.findOne({
            primaryKey: source_pKey
        }, function(err, doc) {
            if (err)
                return callback(err, null);

                // Should be null If we have not installed the datasource yet.
                if (!doc)
                    return cb(err, {});

                var default_filterJSON = undefined;
                if (typeof dataSourceDescription.fe_filters_default !== 'undefined') {
                    default_filterJSON = queryString.stringify(dataSourceDescription.fe_filters_default || {}); // "|| {}" for safety
                }
                var default_listed = true; // list Arrays by default
                if (dataSourceDescription.fe_listed === false) {
                    default_listed = false;
                }
                var default_view = 'gallery';
                if (typeof dataSourceDescription.fe_default_view !== 'undefined') {
                    default_view = dataSourceDescription.fe_default_view;
                }
                var sourceDescription = {
                    key: source_pKey,
                    sourceDoc: doc,
                    title: dataSourceDescription.title,
                    brandColor: dataSourceDescription.brandColor,
                    description: dataSourceDescription.description,
                    urls: dataSourceDescription.urls,
                    arrayListed: default_listed,
                    
                    default_filterJSON: default_filterJSON,
                    default_view: default_view,
                    logo: dataSourceDescription.logo
                };

                cb(err, sourceDescription);
            });

    });

    var completionFn = function(err, sourceDescriptions) {
        var data = {
            env: process.env,
            
            sources: sourceDescriptions,
            team: team
        };
        callback(err, data);
    };

    /**
     * Get team description from team key
     */
    var team;
    async.each(teamDescriptions, function(teamDescription, cb) {
        if (teamDescription.id === urlQuery.team_key) {
            team = teamDescription;
        }
    });

    /**
     * Show only arrays belonging to team with matching team_id
     */
    var team_dataSourceDescriptions = [];
    async.each(dataSourceDescriptions, function(dataSourceDescription, cb) {
        var isTeam = false;
        var team_id = dataSourceDescription.team_id;
        if (typeof team_id !== 'undefined' && team_id !== null) {
            team_dataSourceDescriptions.push(dataSourceDescription);
        }
    }, function(err) {

    });

    /**
     * Show only arrays in team that are front-end visible
     */
    var feVisible_dataSourceDescriptions = [];
    async.each(team_dataSourceDescriptions, function(dataSourceDescription, cb) {
        var isVisible = true;
        var fe_visible = dataSourceDescription.fe_visible;
        if (typeof fe_visible !== 'undefined' && fe_visible !== null && fe_visible === false) {
            isVisible = dataSourceDescription.fe_visible;
        }
        if (isVisible === true) {
            feVisible_dataSourceDescriptions.push(dataSourceDescription);
        }
    }, function(err) {

    });

    async.map(feVisible_dataSourceDescriptions, iterateeFn, completionFn);
    //    ^ parallel execution, but ordered results
};
