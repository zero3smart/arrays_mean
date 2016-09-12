var async = require('async');
var queryString = require('querystring');

var dataSourceDescriptions = require('../../../datasources/descriptions').GetDescriptions();
var teamDescriptions = require('../../../datasources/teams').GetTeams();
var importedDataPreparation = require('../../../datasources/utils/imported_data_preparation');

var constructor = function(options, context) {
    var self = this;
    self.options = options;
    self.context = context;

    return self;
};

constructor.prototype.BindDataFor_array_index = function(callback) {
    var self = this;

    var iterateeFn = async.ensureAsync(function(dataSourceDescription, cb) // prevent stack overflows from this sync iteratee
        {
            var err = null;
            var source_pKey = importedDataPreparation.DataSourcePKeyFromDataSourceDescription(dataSourceDescription, self.context.raw_source_documents_controller);
            self.context.raw_source_documents_controller.Model.findOne({
                primaryKey: source_pKey
            }, function(err, doc) {
                if (err)
                    return callback(err, null);

                // Should be null If we have not installed the datasource yet.
                if (!doc && dataSourceDescription.type != "team")
                    return cb(err, {});

                if (dataSourceDescription.type === "team")
                    source_pKey = dataSourceDescription.id;

                var default_filterJSON = undefined;
                if (typeof dataSourceDescription.fe_filters_default !== 'undefined') {
                    default_filterJSON = queryString.stringify(dataSourceDescription.fe_filters_default || {}); // "|| {}" for safety
                }
                var default_listed = true; // list Arrays by default
                if (dataSourceDescription.fe_listed === false) {
                    default_listed = false;
                }
                var sourceDescription = {
                    key: source_pKey,
                    type: dataSourceDescription.type,
                    arrayCount: dataSourceDescription.arrayCount || null,
                    sourceDoc: doc,
                    title: dataSourceDescription.title,
                    brandColor: dataSourceDescription.brandColor,
                    description: dataSourceDescription.description,
                    urls: dataSourceDescription.urls,
                    arrayListed: default_listed,
                    
                    default_filterJSON: default_filterJSON
                };
                cb(err, sourceDescription);
            });

        });

    var completionFn = function(err, sourceDescriptions) {
        var data = {
            env: process.env,
            
            sources: sourceDescriptions
        };
        callback(err, data);
    };

    var feVisible_dataSourceDescriptions = [];

    /**
     * Don't show arrays belonging to team
     */
    var team;
    async.each(teamDescriptions, function(teamDescription, cb) {
        feVisible_dataSourceDescriptions.push(teamDescription);

        var arrayCount = 0;
        async.each(dataSourceDescriptions, function(dataSourceDescription, cb) {
            if (dataSourceDescription.team_id === teamDescription.id) {
                arrayCount ++;
            }
        });

        teamDescription.type = "team";
        teamDescription.arrayCount = arrayCount;
    });
    
    async.each(dataSourceDescriptions, function(dataSourceDescription, cb) {
        var isVisible = true;
        var fe_visible = dataSourceDescription.fe_visible;
        dataSourceDescription.type = "array";
        if (typeof fe_visible !== 'undefined' && fe_visible !== null && fe_visible === false) {
            isVisible = dataSourceDescription.fe_visible;
        }

        var team_id = dataSourceDescription.team_id;
        if (typeof team_id !== 'undefined' && team_id !== null) {
            isVisible = false;
        }

        if (isVisible === true && dataSourceDescription) {
            feVisible_dataSourceDescriptions.push(dataSourceDescription);
        }
    }, function(err) {

    });

    async.map(feVisible_dataSourceDescriptions, iterateeFn, completionFn);
    //    ^ parallel execution, but ordered results
};

module.exports = constructor;