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


    var teamsObj = {};

    teamDescriptions.GetTeamsAndDatasources(req.user, function (err, teamWithDesc) {

        async.map(teamWithDesc, iterateeFn, completionFn);

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
                    sources: teamsObj
                };

                callback(err, data);
            })
        } else {
            var data = {
                env: process.env,
                user: user,
                sources: teamsObj
            };

            callback(err, data);
        }
    };


    var iterateeFn = async.ensureAsync(function (teamDescription, cb) {


        var err = null;
        var subdomain = teamDescription.subdomain;

        var t = {
            title: teamDescription.title,
            subdomain: teamDescription.subdomain,
            admin: teamDescription.admin,
            editors: teamDescription.editors,
            _id: teamDescription._id

        };

        if (teamDescription.datasourceDescriptions.length == 0) {
            return cb(null);
        }


        if (!teamsObj[subdomain]) {
            teamsObj[subdomain] = {};
        }

        teamsObj[subdomain].team = t;


        async.each(teamDescription.datasourceDescriptions, function (dataSourceDescription, innerCallback) {

            var source_pKey = importedDataPreparation.DataSourcePKeyFromDataSourceDescription(dataSourceDescription, raw_source_documents);


            raw_source_documents.Model.findOne({
                primaryKey: source_pKey
            }, function (err, doc) {

                if (err) {
                    innerCallback(err, null);
                } else {

                    var default_filterJSON;
                    if (dataSourceDescription.fe_filters.default) {
                        default_filterJSON = queryString.stringify(dataSourceDescription.fe_filters.default || {})
                    }
                    var default_view = 'gallery';
                    if (dataSourceDescription.fe_views.default_view) {
                        default_view = dataSourceDescription.fe_views.default_view;
                    }

                    var s = {
                        key: source_pKey,
                        sourceDoc: doc,
                        title: dataSourceDescription.title,
                        brandColor: dataSourceDescription.brandColor,
                        description: dataSourceDescription.description,
                        urls: dataSourceDescription.urls,
                        default_view: default_view,
                        default_filterJSON: default_filterJSON
                    };

                    if (!teamsObj[subdomain].dataSourceDescriptions) {
                        teamsObj[subdomain].dataSourceDescriptions = [];
                    }
                    teamsObj[subdomain].dataSourceDescriptions.push(s);
                    innerCallback(null);
                }

            })

        }, function (err) {
            cb(err);
        })

    })


};


    


