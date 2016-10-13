var async = require('async');
var queryString = require('querystring');

var dataSourceDescriptions = require('../../../datasources/descriptions');
// var teamDescriptions = require('../../../datasources/teams').GetTeams();

var Promise = require('q').Promise;

var importedDataPreparation = require('../../../datasources/utils/imported_data_preparation');
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

            // Should be null If we have not installed the datasource yet.
            // if (!doc && dataSourceDescription.type != "team")
            //     return cb(err, {});

            // if (dataSourceDescription.type === "team")
            //     source_pKey = dataSourceDescription.id;

            // var default_filterJSON = undefined;
            // if (typeof dataSourceDescription.fe_filters_default !== 'undefined') {
            //     default_filterJSON = queryString.stringify(dataSourceDescription.fe_filters_default || {}); // "|| {}" for safety
            // }
            // var default_listed = true; // list Arrays by default
            // if (dataSourceDescription.fe_listed === false) {
            //     default_listed = false;
            // }
            // var default_view = 'gallery';
            // if (typeof dataSourceDescription.fe_default_view !== 'undefined') {
            //     default_view = dataSourceDescription.fe_default_view;
            // }

            var type;
            if (typeof dataSourceDescription.sourceURL != 'undefined') {
                type = "array";
            } else {
                type = "team";
            }






            var sourceDescription = {
                key: source_pKey,
                type: type,
                arrayCount: dataSourceDescription.arrayCount || null,
                sourceDoc: doc,
                title: dataSourceDescription.title,
                brandColor: dataSourceDescription.brandColor,
                description: dataSourceDescription.description,
                urls: dataSourceDescription.urls,
                arrayListed: dataSourceDescription.fe_listed,

                default_view: dataSourceDescription.fe_views.default_view,
                default_filterJSON: queryString.stringify(dataSourceDescription.fe_filters.default_filter)
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

    var getDatasourceDescriptionsFn = new Promise(function(resolve,reject) {
         dataSourceDescriptions.GetDescriptions(function(all_descriptions) {
            resolve(all_descriptions);
        },function(err) {
            reject(err);
        })
    })


    Promise.all([getDatasourceDescriptionsFn]).then(values=> {
        var feVisible_dataSourceDescriptions = values[0];
        async.map(feVisible_dataSourceDescriptions, iterateeFn, completionFn);
    })




    // dataSourceDescriptions.GetDescriptions(function(all_descriptions) {
    //    /**
    //      * Don't show arrays belonging to team
    //      */
    //     // var team;
    //     // async.each(teamDescriptions, function (teamDescription, cb) {
    //     //     feVisible_dataSourceDescriptions.push(teamDescription);

    //     //     var arrayCount = 0;
    //     //     async.each(dataSourceDescriptions, function (dataSourceDescription, cb) {
    //     //         if (dataSourceDescription.team_id === teamDescription.id) {
    //     //             arrayCount++;
    //     //         }
    //     //     });

    //     //     teamDescription.type = "team";
    //     //     teamDescription.arrayCount = arrayCount;
    //     // });


    //     async.each(all_descriptions, function (dataSourceDescription, cb) {
    //         var isVisible = true;
    //         var fe_visible = dataSourceDescription.fe_visible;
    //         dataSourceDescription.type = "array";
    //         if (typeof fe_visible !== 'undefined' && fe_visible !== null && fe_visible === false) {
    //             isVisible = dataSourceDescription.fe_visible;
    //         }

    //         var team_id = dataSourceDescription.team_id;
    //         if (typeof team_id !== 'undefined' && team_id !== null) {
    //             isVisible = false;
    //         }

    //         if (isVisible === true && dataSourceDescription) {
    //             feVisible_dataSourceDescriptions.push(dataSourceDescription);
    //         }
    //     }, function (err) {

    //     });

    //     async.map(feVisible_dataSourceDescriptions, iterateeFn, completionFn);
    //     //    ^ parallel execution, but ordered results
        
    // })

 





    
};