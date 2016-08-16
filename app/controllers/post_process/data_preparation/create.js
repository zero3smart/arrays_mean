var async = require('async');

var config = require('../config');
var functions = require('../functions');
var dataSourceDescriptions = require('../../../datasources/descriptions').GetDescriptions();
var importedDataPreparation = require('../../../datasources/utils/imported_data_preparation');

var constructor = function(options, context) {
    var self = this;
    self.options = options;
    self.context = context;

    return self;
};

constructor.prototype.BindDataFor_datasetsListing = function(callback)
{
    var self = this;
    var iterateeFn = async.ensureAsync(function(dataSourceDescription, cb) // prevent stack overflows from this sync iteratee
    {
        var err = null;
        var source_pKey = importedDataPreparation.DataSourcePKeyFromDataSourceDescription(dataSourceDescription, self.context.raw_source_documents_controller);
        self.context.raw_source_documents_controller.Model.findOne({ primaryKey: source_pKey }, function(err, doc)
        {
            if (err)
                return callback(err, null);

            // Should be null If we have not installed the datasource yet.
            if (!doc)
                return cb(err, {});

            var default_filterJSON = undefined;
            if (typeof dataSourceDescription.fe_filters_default !== 'undefined') {
                default_filterJSON = JSON.stringify(dataSourceDescription.fe_filters_default || {}); // "|| {}" for safety
            }
            var default_listed = true; // list Arrays by default
            if (dataSourceDescription.fe_listed == false) {
                default_listed = false;
            }
            var sourceDescription =
            {
                key: source_pKey,
                sourceDoc: doc,
                title: dataSourceDescription.title,
                brandColor: dataSourceDescription.brandColor,
                description: dataSourceDescription.description,
                urls: dataSourceDescription.urls,
                arrayListed: default_listed,
                //
                default_filterJSON: default_filterJSON
            }
            cb(err, sourceDescription);
        });

    });
    var completionFn = function(err, sourceDescriptions)
    {
        var data =
        {
            env: process.env,
            //
            sources: sourceDescriptions
        };
        callback(err, data);
    };
    var feVisible_dataSourceDescriptions = [];
    async.each(dataSourceDescriptions, function(dataSourceDescription, cb)
    {
        var isVisible = true;
        var fe_visible = dataSourceDescription.fe_visible;
        if (typeof fe_visible !== 'undefined' && fe_visible != null && fe_visible === false) {
            isVisible = dataSourceDescription.fe_visible;
        }
        if (isVisible == true) {
            feVisible_dataSourceDescriptions.push(dataSourceDescription);
        }
    }, function(err)
    {

    });
    async.map(feVisible_dataSourceDescriptions, iterateeFn, completionFn);
    //    ^ parallel execution, but ordered results
};

module.exports = constructor;