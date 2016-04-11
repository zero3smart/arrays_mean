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
var pageSize = 250;
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
constructor.prototype.BindDataFor_datasetsListing = function(callback)
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
constructor.prototype.PageSize = function() { return pageSize; };
//
constructor.prototype.BindDataFor_array_gallery = function(urlQuery, callback)
{
    var self = this;
    // urlQuery keys:
        // source_key
        // page
        // sortBy
        // sortDir
        // filterCol
        // filterVal
        // searchQ
        // searchCol
    var source_pKey = urlQuery.source_key;
    var dataSourceDescription = self._dataSourceDescriptionWithPKey(source_pKey);
    var processedRowObjects_mongooseContext = self.context.processed_row_objects_controller.Lazy_Shared_ProcessedRowObject_MongooseContext(source_pKey);
    var processedRowObjects_mongooseModel = processedRowObjects_mongooseContext.Model;
    //
    var pageNumber = urlQuery.page ? urlQuery.page : 1;
    var skipNResults = pageSize * (Math.max(pageNumber, 1) - 1);
    var limitToNResults = pageSize;
    //
    var sortBy = urlQuery.sortBy; // the human readable col name - real col name derived below
    var sortDir = urlQuery.sortDir;
    var sortDirection = sortDir ? sortDir == 'Ascending' ? 1 : -1 : 1;
    //
    var filterCol = urlQuery.filterCol;
    var filterVal = urlQuery.filterVal;
    var isFilterActive = typeof filterCol !== 'undefined' && filterCol != null && filterCol != "";
    //
    var searchCol = urlQuery.searchCol;
    var searchQ = urlQuery.searchQ;
    var isSearchActive = typeof searchCol !== 'undefined' && searchCol != null && searchCol != "" // Not only a column
                      && typeof searchQ !== 'undefined' && searchQ != null && searchQ != "";  // but a search query
    //
    var wholeFilteredSet_aggregationOperators = [];
    if (isSearchActive) { // Search must occur as the first pipeline stage or Mongo will error
        // NOTE: A text index is required for this not to error. Currently, it must be created manually as
        // indexes created dynamically are not yet guaranteed to have been built according to code written so far,
        // and building such indexes dynamically is very unperformant
        var realColumnName_path = "rowParams." + self._realColumnNameFromHumanReadableColumnName(searchCol, dataSourceDescription);
        var matchOp = {};
        matchOp["$match"] = {};
        matchOp["$match"]["$text"] = {};
        matchOp["$match"]["$text"]["$search"] = searchQ;
        wholeFilteredSet_aggregationOperators.push(matchOp);
    }
    if (isFilterActive) { // rules out undefined filterCol
        var realColumnName_path = "rowParams." + self._realColumnNameFromHumanReadableColumnName(filterCol, dataSourceDescription);
        var matchOp = {};
        matchOp["$match"] = {};
        matchOp["$match"][realColumnName_path] = filterVal;
        wholeFilteredSet_aggregationOperators.push(matchOp);
    }
    //
    // Now kick off the query work
    _proceedTo_countWholeSet();
    function _proceedTo_countWholeSet()
    {
        var countWholeFilteredSet_aggregationOperators = wholeFilteredSet_aggregationOperators.concat([
            { // Count
                $group: {
                    _id: 1,
                    count: { $sum: 1 }
                }
            }
        ]);
        var countWhole_doneFn = function(err, results)
        {
            if (err) {
                callback(err, null);
            
                return;
            }
            var nonpagedCount = 0;
            if (results == undefined || results == null || results.length == 0) {
                // 0
            } else {
                nonpagedCount = results[0].count;
            }
            _proceedTo_obtainPagedDocs(nonpagedCount);
        };
        processedRowObjects_mongooseModel.aggregate(countWholeFilteredSet_aggregationOperators).exec(countWhole_doneFn);
    }
    function _proceedTo_obtainPagedDocs(nonpagedCount)
    {
        var sortBy_realColumnName = self._realColumnNameFromHumanReadableColumnName(sortBy ? sortBy : humanReadableColumnName_objectTitle, dataSourceDescription);
        var pagedDocs_aggregationOperators = wholeFilteredSet_aggregationOperators.concat([
            // Sort (before pagination):
            
            //
            // Pagination:
            {
                $skip: skipNResults
            },
            {
                $limit: limitToNResults
            }
        ]);
        var pagedDocs_doneFn = function(err, docs)
        {
            if (err) {
                callback(err, null);
            
                return;
            }
            if (docs == undefined || docs == null || docs.length == 0) {
                docs = [];
            }
            _prepareDataAndCallBack(nonpagedCount, docs);
        };
        processedRowObjects_mongooseModel.aggregate(pagedDocs_aggregationOperators).exec(pagedDocs_doneFn);
    }
    function _prepareDataAndCallBack(nonpagedCount, docs)
    {
        var err = null;
        var hasThumbs = dataSourceDescription.fe_designatedFields.gridThumbImageURL ? true : false;
        var data =
        {
            pageSize: pageSize < nonpagedCount ? pageSize : nonpagedCount,
            onPageNum: pageNumber,
            numPages: Math.ceil(nonpagedCount / pageSize),
            nonpagedCount: nonpagedCount,
            //
            docs: docs,
            //
            fieldKey_objectTitle: dataSourceDescription.fe_designatedFields.objectTitle,
            //
            hasThumbs: hasThumbs,
            fieldKey_gridThumbImageURL: hasThumbs ? dataSourceDescription.fe_designatedFields.gridThumbImageURL : undefined,
            //
            sortBy: sortBy,
            sortDir: sortDir,
            //
            filterCol: filterCol,
            filterVal: filterVal,
            isFilterActive: isFilterActive,
            //
            searchQ: searchQ,
            searchCol: searchCol,
            isSearchActive: isSearchActive            
        };
        callback(err, data);
    }
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