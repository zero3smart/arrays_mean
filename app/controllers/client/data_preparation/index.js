var async = require('async');
var queryString = require('querystring');

var dataSourceDescriptions = require('../../../models/descriptions');
var teamDescriptions = require('../../../models/teams')

var Promise = require('q').Promise;

var importedDataPreparation = require('../../../lib/datasources/imported_data_preparation');
var raw_source_documents = require('../../../models/raw_source_documents');

module.exports.BindData = function (req, callback) {
    var self = this;

    var iterateeFn = async.ensureAsync(function (dataSourceDescription, cb) // prevent stack overflows from this sync iteratee
    {
        var err = null;
        var source_pKey = importedDataPreparation.DataSourcePKeyFromDataSourceDescription(dataSourceDescription, raw_source_documents);
        raw_source_documents.Model.findOne({
            primaryKey: source_pKey
        }, function (err, doc) {

    
            if (err)
                return callback(err, null);


            var type;
            if (typeof dataSourceDescription.uid != 'undefined') {
                type = "array";
            } else {
                type = "team";
            }

            // Should be null If we have not installed the datasource yet.
            if (!doc && type != "team")
                return cb(err, {});

            if (type === "team")
                source_pKey = dataSourceDescription.tid;

            var default_filterJSON = undefined;
            if (type == "array" && typeof dataSourceDescription.fe_filters !== 'undefined' &&
                dataSourceDescription.fe_filters.default) {
                default_filterJSON = queryString.stringify(dataSourceDescription.fe_filters.default || {}); // "|| {}" for safety
            }
            var default_listed = true; // list Arrays by default
            if (dataSourceDescription.fe_listed === false) {
                default_listed = false;
            }
            var default_view = 'gallery';
            if (type == "array" && typeof dataSourceDescription.fe_views !== 'undefined' &&
                dataSourceDescription.fe_views.default_view) {
                default_view = dataSourceDescription.fe_views.default_view;
            }

            var type;
            if (typeof dataSourceDescription.uid != 'undefined') {
                type = "array";
            } else {
                type = "team";
            }

            var arrayCount = null;

            if (dataSourceDescription.datasourceDescriptions) {
                arrayCount = dataSourceDescription.datasourceDescriptions.length;
            }

            var sourceDescription = {
                key: source_pKey,
                type: type,
                arrayCount: arrayCount,
                sourceDoc: doc,
                title: dataSourceDescription.title,
                brandColor: dataSourceDescription.brandColor,
                description: dataSourceDescription.description,
                urls: dataSourceDescription.urls,
                arrayListed: default_listed,
                default_view: default_view,
                default_filterJSON: default_filterJSON
            };

            cb(err, sourceDescription);
        });

    });

    var completionFn = function (err, sourceDescriptions) {
        var data = {
            env: process.env,

            user: req.user,
            sources: sourceDescriptions
        };
        callback(err, data);
    };

    var getDatasourceDescriptionsFn = new Promise(function (resolve, reject) {
        dataSourceDescriptions.GetDescriptions(function (err, all_datasourceDescriptions) {
            if (err) reject(err);
            resolve(all_datasourceDescriptions);
        })
    })

    var getTeamDescriptionsFn = new Promise(function (resolve, reject) {
        teamDescriptions.GetTeams(function (err, all_teamDescriptions) {
            if (err) reject(err);
        

            resolve(all_teamDescriptions);
        })

    })

    Promise.all([getDatasourceDescriptionsFn, getTeamDescriptionsFn]).then(function(values) {
        var feVisible_dataSourceDescriptions = values[0].concat(values[1]);
        async.map(feVisible_dataSourceDescriptions, iterateeFn, completionFn);
    });
};