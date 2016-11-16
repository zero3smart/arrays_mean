var async = require('async');
var queryString = require('querystring');
var _ = require("lodash");

var dataSourceDescriptions = require('../../../../models/descriptions');
var teamDescriptions = require('../../../../models/teams')
var importedDataPreparation = require('../../../../libs/datasources/imported_data_preparation');
var raw_source_documents = require('../../../../models/raw_source_documents');

module.exports.BindData = function (req, urlQuery, callback) {
    var self = this;


    var team;
    var team_dataSourceDescriptions;


    teamDescriptions.findOneByTidAndPopulateDatasourceDescription(urlQuery.team_key, function (err, objReturned) {


        team = objReturned.team;
        team_dataSourceDescriptions = objReturned.team_dataSourceDescriptions;

        async.map(team_dataSourceDescriptions, iterateeFn, completionFn);
    })


    var iterateeFn = async.ensureAsync(function (dataSourceDescription, cb) // prevent stack overflows from this sync iteratee
    {

        var err = null;
        var source_pKey = importedDataPreparation.DataSourcePKeyFromDataSourceDescription(dataSourceDescription);


        raw_source_documents.Model.findOne({
            primaryKey: source_pKey
        }, function (err, doc) {
            if (err)
                return callback(err, null);

            // Should be null If we have not installed the datasource yet.
            if (!doc)
                return cb(err, {});

            var default_filterJSON = undefined;
            if (typeof dataSourceDescription.fe_filters.default !== 'undefined') {
                default_filterJSON = queryString.stringify(dataSourceDescription.fe_filters.default || {}); // "|| {}" for safety
            }
            var default_listed = true; // list Arrays by default
            if (dataSourceDescription.fe_listed === false) {
                default_listed = false;
            }
            var default_view = 'gallery';
            if (typeof dataSourceDescription.fe_views.default_view !== 'undefined') {
                default_view = dataSourceDescription.fe_views.default_view;
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

    var completionFn = function (err, sourceDescriptions) {
        var data = {
            env: process.env,

            user: req.user,
            sources: sourceDescriptions,
            team: team
        };
        callback(err, data);
    };

};
