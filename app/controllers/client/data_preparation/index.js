var async = require('async');
var queryString = require('querystring');

var dataSourceDescriptions = require('../../../models/descriptions');
var teamDescriptions = require('../../../models/teams');

var Promise = require('q').Promise;

var importedDataPreparation = require('../../../libs/datasources/imported_data_preparation');
var raw_source_documents = require('../../../models/raw_source_documents');
var _ = require("lodash");
var User = require('../../../models/users');

module.exports.BindData = function (req, callback) {
    var datasetArray = [];

    dataSourceDescriptions.GetAllDescriptions(req.user, function (err, descriptions) {

        async.mapSeries(descriptions, iterateeFn, completionFn);

    });

    var completionFn = function (err) {

        var user = null;
        if (req.user) {
            User.findById(req.user, function(err, doc) {
                if (err) return callback(err);
                user = doc;

                var data = {
                    env: process.env,
                    user: user,
                    sources: datasetArray
                };

                callback(err, data);
            })
        } else {
            var data = {
                env: process.env,
                user: user,
                sources: datasetArray
            };
            callback(err, data);
        }
    };


    var iterateeFn = async.ensureAsync(function (description, cb) {


        var err = null;
        subdomain = description._team.subdomain;

        raw_source_documents.Model.findOne({
            primaryKey: description._id
        }, function (err, doc) {

            if (err) {
                cb(err, null);
            } else {

                var default_filterJSON;
                if (description.fe_filters.default) {
                    default_filterJSON = queryString.stringify(description.fe_filters.default || {})
                }
                var default_view = 'gallery';
                if (description.fe_views.default_view) {
                    default_view = description.fe_views.default_view;
                }

               

                var rootDomain = process.env.HOST ? process.env.HOST : 'localhost:9080';

                var baseUrl = process.env.USE_SSL === 'true' ? 'https://' : 'http://';

                baseUrl += description._team.subdomain + "." + rootDomain

                var reformattedDataset = {
                    _id: description._id,
                    key:  description.uid + '-r' + description.importRevision,
                    sourceDoc: doc,
                    title: description.title,
                    brandColor: description.brandColor,
                    description: description.description,
                    urls: description.urls,
                    default_view: default_view,
                    default_filterJSON: default_filterJSON,
                    datasetBaseLink: baseUrl,
                    banner: description.banner,
                    teamTitle: description._team.title,
                    subdomain: description._team.subdomain,
                    admin: description._team.admin,
                };
                
                datasetArray.push(reformattedDataset);

                cb(null);
            }

        })
    })


};


    

