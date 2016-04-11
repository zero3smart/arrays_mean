//
//
////////////////////////////////////////////////////////////////////////////////
// Imports
//
var winston = require('winston');
var async = require('async');
var dataSourceDescriptions = require('../data_ingestion/MVP_datasource_descriptions').Descriptions;
//
//
////////////////////////////////////////////////////////////////////////////////
// Constants
//
var humanReadableColumnName_objectTitle = "Object Title";
//
//
////////////////////////////////////////////////////////////////////////////////
// Controller - Initialization
//
var constructor = function(options, context)
{
    var self = this;
    self.options = options;
    self.context = context;
    //
    self._init();
    //
    return self;
};
module.exports = constructor;
constructor.prototype._init = function()
{
    var self = this;
};
//
//
////////////////////////////////////////////////////////////////////////////////
// Controller - Accessors - Public
//
constructor.prototype.DataFor_datasetsListing = function(callback)
{
    var self = this;
    var iterateeFn = async.ensureAsync(function(dataSourceDescription, cb) // prevent stack overflows from this sync iteratee
    {
        var err = null;
        var source = 
        {
            key: self._dataSourcePKeyFromDataSourceDescription(dataSourceDescription),
            title: dataSourceDescription.title,
            description: dataSourceDescription.description,
            urls: dataSourceDescription.urls
        }
        cb(err, source);
    });
    var completionFn = function(err, results)
    {
        var data = 
        {
            sources: results
        };
        callback(err, data);
    };
    async.map(dataSourceDescriptions, iterateeFn, completionFn);
    //    ^ parallel execution, but ordered results
};
//
constructor.prototype.DataFor_array_gallery = function(parameters, callback)
{
    var self = this;
    var source_pKey = parameters.source_pKey; 
    if (typeof source_pKey === 'undefined') {
        callback(new Error('source_pKey undefined but required'), null);
        
        return;
    }
    var dataSourceDescription = self._dataSourceDescriptionWithPKey(source_pKey);
    console.log("dataSourceDescription " ,dataSourceDescription)
    //
    var processedRowObjects_mongooseContext = self.context.processed_row_objects_controller.Lazy_Shared_ProcessedRowObject_MongooseContext(source_pKey);
    var processedRowObjects_mongooseModel = processedRowObjects_mongooseContext.Model;
    //
    var pageLength = parameters.pageLength;
    var pageNumber = parameters.pageNumber;
    var skipNResults = pageLength * (Math.max(pageNumber, 1) - 1);
    var limitToNResults = pageLength;
    //
    // TODO:
    // use _realColumnNameFromHumanReadableColumnName
    // sortByColumnName: urlQuery.sortBy ? urlQuery.sortBy : "Object Title",
    // sortDirection: urlQuery.sortDir ? urlQuery.sortDir == 'Ascending' ? 1 : -1 : 1,
    //
    // filterColumn: urlQuery.filterCol, // if undefined, not filtered
    // filterValue: urlQuery.filterVal,
    //
    // searchQueryString: urlQuery.searchQ, // if undefined or "", no search active
    // searchValuesOfColumn: urlQuery.searchCol
    //
    var aggregationOperators = 
    [
        // Pagination:
        {
            $skip: skipNResults
        },
        {
            $limit: limitToNResults
        }
        //
    ];
    var doneFn = function(err, docs)
    {
        if (err) {
            callback(err, null);
            
            return;
        }
        if (docs == undefined || docs == null || docs.length == 0) {
            docs = [];
        }
        var data =
        {
            docs: docs
        };
        callback(err, data);
    };
    processedRowObjects_mongooseModel.aggregate(aggregationOperators).exec(doneFn);
};
//
//
////////////////////////////////////////////////////////////////////////////////
// Controller - Accessors - Private
//
constructor.prototype._dataSourcePKeyFromDataSourceDescription = function(dataSourceDescription)
{
    var self = this;
    var uid = dataSourceDescription.uid;
    var importRevision = dataSourceDescription.importRevision;
    var pKey = self.context.raw_source_documents_controller.NewCustomPrimaryKeyStringWithComponents(uid, importRevision);
    
    return pKey;
};
//
constructor.prototype._dataSourceDescriptionWithPKey = function(source_pKey)
{
    var self = this;
    var dataSourceDescriptions_length = dataSourceDescriptions.length;
    for (var i = 0 ; i < dataSourceDescriptions_length ; i++) {
        var dataSourceDescription = dataSourceDescriptions[i];
        var dataSourceDescription_pKey = self._dataSourcePKeyFromDataSourceDescription(dataSourceDescription);
        if (dataSourceDescription_pKey === source_pKey) {
            return dataSourceDescription;
        }
    }
    
    return null;
};
//
constructor.prototype._realColumnNameFromHumanReadableColumnName = function(humanReadableColumnName, dataSourceDescription)
{
    if (humanReadableColumnName === humanReadableColumnName_objectTitle) {
        return dataSourceDescription.fe_designatedFields.objectTitle;
    }
    
    return humanReadableColumnName;
};