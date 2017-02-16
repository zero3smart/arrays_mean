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



        if (teamDescription.datasourceDescriptions.length == 0) {
            return cb(null);
        }


        var err = null;
        subdomain = teamDescription.subdomain;

        var t = {
            title: teamDescription.title,
            subdomain: teamDescription.subdomain,
            admin: teamDescription.admin,
            editors: teamDescription.editors,
            _id: teamDescription._id

        };


        if (!teamsObj[subdomain]) {
            teamsObj[subdomain] = {};
        }

        teamsObj[subdomain].team = t;


        async.each(teamDescription.datasourceDescriptions, function (dataSourceDescription, innerCallback) {
            


            raw_source_documents.Model.findOne({
                primaryKey: dataSourceDescription._id
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

                   

                    var rootDomain = process.env.HOST ? process.env.HOST : 'localhost:9080';

                    var baseUrl = process.env.USE_SSL === 'true' ? 'https://' : 'http://';

                    baseUrl += teamDescription.subdomain + "." + rootDomain


                
                    var s = {
                        key:  dataSourceDescription.uid + '-r' + dataSourceDescription.importRevision,
                        _id: dataSourceDescription._id,
                        sourceDoc: doc,
                        title: dataSourceDescription.title,
                        brandColor: dataSourceDescription.brandColor,
                        description: dataSourceDescription.description,
                        urls: dataSourceDescription.urls,
                        default_view: default_view,
                        default_filterJSON: default_filterJSON,
                        datasetBaseLink: baseUrl,
                        banner: dataSourceDescription.banner

                    };

                    if (!teamsObj[teamDescription.subdomain].dataSourceDescriptions) {
                        teamsObj[teamDescription.subdomain].dataSourceDescriptions = [];
                    }
                    teamsObj[teamDescription.subdomain].dataSourceDescriptions.push(s);

                    innerCallback(null);
                }

            })

        }, function (err) {
            cb(err);
        })

    })


};


    


