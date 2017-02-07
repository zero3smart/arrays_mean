var async = require('async');
var queryString = require('querystring');
var _ = require("lodash");

var dataSourceDescriptions = require('../../../../models/descriptions');
var teamDescriptions = require('../../../../models/teams');
var importedDataPreparation = require('../../../../libs/datasources/imported_data_preparation');
var raw_source_documents = require('../../../../models/raw_source_documents');
var User = require('../../../../models/users');

module.exports.BindData = function (req, teamDescription, callback) {
    var team = _.omit(teamDescription, 'datasourceDescriptions');
    var team_dataSourceDescriptions = teamDescription.datasourceDescriptions;


    var iterateeFn = async.ensureAsync(function (dataSourceDescription, cb) // prevent stack overflows from this sync iteratee
    {

        var err = null;
 

        raw_source_documents.Model.findOne({
            primaryKey: dataSourceDescription._id
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
            var updatedByDisplayName = dataSourceDescription.updatedBy.firstName + " " + dataSourceDescription.updatedBy.lastName
            var authorDisplayName = dataSourceDescription.author.firstName + " " + dataSourceDescription.author.lastName;

            var sourceDescription = {
                key: dataSourceDescription.uid + '-r' + dataSourceDescription.importRevision,
                sourceDoc: doc,
                title: dataSourceDescription.title,
                brandColor: dataSourceDescription.brandColor,
                description: dataSourceDescription.description,
                urls: dataSourceDescription.urls,
                lastUpdatedBy: updatedByDisplayName,
                author: authorDisplayName,
                arrayListed: default_listed,
                arrayVisible: dataSourceDescription.fe_visible,

                default_filterJSON: default_filterJSON,
                default_view: default_view,
                banner: dataSourceDescription.banner
            };

            cb(err, sourceDescription);
        });

    });



    var completionFn = function (err, sourceDescriptions) {

        var rootDomain = process.env.HOST ? process.env.HOST : 'localhost:9080';

        var baseUrl = process.env.USE_SSL === 'true' ? 'https://' : 'http://';

        baseUrl += teamDescription.subdomain + "." + rootDomain



        var data = {
            env: process.env,
            sources: sourceDescriptions,
            team: team,
            baseUrl: baseUrl

        };

        if (req.user) {
            User.findById(req.user, function(err, user) {
                if (err) return callback(err);
                data.user = user;
                callback(err, data);
            })
        } else {
            callback(err, data);
        }
    };

    async.map(team_dataSourceDescriptions, iterateeFn, completionFn);

};
