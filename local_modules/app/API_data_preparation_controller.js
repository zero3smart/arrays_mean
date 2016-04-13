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
    _proceedTo_obtainSampleDocument();
    function _proceedTo_obtainSampleDocument()
    {
        processedRowObjects_mongooseModel.findOne({}, function(err, sampleDoc)
        {
            if (err) {
                callback(err, null);
            
                return;
            }
            _proceedTo_obtainUniqueFieldValuesForFiltering(sampleDoc);
        });
    }
    function _proceedTo_obtainUniqueFieldValuesForFiltering(sampleDoc)
    {
        var feVisible_keys = self._rowParamKeysFromSampleRowObject_sansFEExcludedFields(sampleDoc, dataSourceDescription);
        var feVisible_keys_length = feVisible_keys.length;
        var uniqueOp = { $group: { _id: 1 } }; // TODO: sum incidence and sort before limit to get top vals?
        var limitOp = { $project: { } };
        for (var i = 0 ; i < feVisible_keys_length ; i++) {
            var key = feVisible_keys[i];
            var keyPath = "rowParams." + key; 
            uniqueOp["$group"][key] = { $addToSet: "$" + keyPath };
            limitOp["$project"][key] = { $slice: [ "$" + key, 0, 50 ] };
        }
        var uniqueFieldValues_aggregationOperators = 
        [
            uniqueOp,
            limitOp
        ];
        var doneFn = function(err, results)
        {
            if (err) {
                callback(err, null);
            
                return;
            }
            if (results == undefined || results == null || results.length == 0) {
                callback(new Error('Unexpectedly empty unique field value aggregation'), null);
                
                return;
            }
            var uniqueFieldValuesByFieldName = results[0];
            delete uniqueFieldValuesByFieldName["_id"];
            _proceedTo_countWholeSet(sampleDoc, uniqueFieldValuesByFieldName);
        };
        processedRowObjects_mongooseModel.aggregate(uniqueFieldValues_aggregationOperators).exec(doneFn);
    }
    function _proceedTo_countWholeSet(sampleDoc, uniqueFieldValuesByFieldName)
    {
        var countWholeFilteredSet_aggregationOperators = wholeFilteredSet_aggregationOperators.concat([
            { // Count
                $group: {
                    _id: 1,
                    count: { $sum: 1 }
                }
            }
        ]);
        var doneFn = function(err, results)
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
            _proceedTo_obtainPagedDocs(sampleDoc, uniqueFieldValuesByFieldName, nonpagedCount);
        };
        processedRowObjects_mongooseModel.aggregate(countWholeFilteredSet_aggregationOperators).exec(doneFn);
    }
    function _proceedTo_obtainPagedDocs(sampleDoc, uniqueFieldValuesByFieldName, nonpagedCount)
    {
        var sortBy_realColumnName_path = "rowParams." + self._realColumnNameFromHumanReadableColumnName(sortBy ? sortBy : humanReadableColumnName_objectTitle, 
                                                                                                        dataSourceDescription);
        var sortOpParams = {};
        sortOpParams[sortBy_realColumnName_path] = sortDirection;
        //
        var pagedDocs_aggregationOperators = wholeFilteredSet_aggregationOperators.concat([
            // Sort (before pagination):
            { $sort: sortOpParams },
            // Pagination
            {
                $skip: skipNResults
            },
            {
                $limit: limitToNResults
            }
        ]);
        var doneFn = function(err, docs)
        {
            if (err) {
                callback(err, null);
            
                return;
            }
            if (docs == undefined || docs == null || docs.length == 0) {
                docs = [];
            }
            _prepareDataAndCallBack(sampleDoc, uniqueFieldValuesByFieldName, nonpagedCount, docs);
        };
        processedRowObjects_mongooseModel.aggregate(pagedDocs_aggregationOperators).exec(doneFn);
    }
    function _prepareDataAndCallBack(sampleDoc, uniqueFieldValuesByFieldName, nonpagedCount, docs)
    {
        var err = null;
        var hasThumbs = dataSourceDescription.fe_designatedFields.gridThumbImageURL ? true : false;
        var routePath_base = "/array/" + source_pKey + "/gallery";
        var routePath_withoutFilter = routePath_base;
        var routePath_withoutSearch = routePath_base;
        if (sortBy !== undefined && sortBy != null && sortBy !== "") {
            routePath_withoutFilter = _routePathByAppendingQueryStringToVariationOfBase(routePath_withoutFilter,
                                                                                        "sortBy=" + sortBy,
                                                                                        routePath_base);
            routePath_withoutSearch = _routePathByAppendingQueryStringToVariationOfBase(routePath_withoutSearch,
                                                                                        "sortBy=" + sortBy,
                                                                                        routePath_base);
        }
        if (sortDir !== undefined && sortDir != null && sortDir !== "") {
            routePath_withoutFilter = _routePathByAppendingQueryStringToVariationOfBase(routePath_withoutFilter,
                                                                                        "sortDir=" + sortDir,
                                                                                        routePath_base);
            routePath_withoutSearch = _routePathByAppendingQueryStringToVariationOfBase(routePath_withoutSearch,
                                                                                        "sortDir=" + sortDir,
                                                                                        routePath_base);
        }
        if (isFilterActive) {
            routePath_withoutSearch = _routePathByAppendingQueryStringToVariationOfBase(routePath_withoutSearch,
                                                                                        "filterCol=" + filterCol + "&" + "filterVal=" + filterVal,
                                                                                        routePath_base);
        }
        if (isSearchActive) {
            routePath_withoutFilter = _routePathByAppendingQueryStringToVariationOfBase(routePath_withoutFilter,
                                                                                        "searchCol=" + searchCol + "&" + "searchQ=" + searchQ,
                                                                                        routePath_base);
        }
        var data =
        {
            arrayTitle: dataSourceDescription.title,
            array_source_key: source_pKey,
            //
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
            uniqueFieldValuesByFieldName: uniqueFieldValuesByFieldName,
            //
            searchQ: searchQ,
            searchCol: searchCol,
            isSearchActive: isSearchActive,
            //
            routePath_base: routePath_base,
            routePath_withoutFilter: routePath_withoutFilter,
            routePath_withoutSearch: routePath_withoutSearch
        };
        callback(err, data);
    }
    function _routePathByAppendingQueryStringToVariationOfBase(routePath_variation, queryString, routePath_base)
    {
        if (routePath_variation === routePath_base) {
            routePath_variation += "?";
        } else {
            routePath_variation += "&";
        }
        routePath_variation += queryString;
        
        return routePath_variation;
    }
};
//
constructor.prototype.BindDataFor_array_objectDetails = function(source_pKey, rowObject_id, callback)
{
    var self = this;
    var dataSourceDescription = self._dataSourceDescriptionWithPKey(source_pKey);
    var processedRowObjects_mongooseContext = self.context.processed_row_objects_controller.Lazy_Shared_ProcessedRowObject_MongooseContext(source_pKey);
    var processedRowObjects_mongooseModel = processedRowObjects_mongooseContext.Model;
    var query =
    {
        _id: rowObject_id,
        srcDocPKey: source_pKey
    };
    processedRowObjects_mongooseModel.findOne(query, function(err, rowObject)
    {
        if (err) {
            callback(err, null);
        
            return;
        }
        if (rowObject == null) {
            callback(null, null);
            
            return;
        }
        var colNames_sansObjectTitle = self._humanReadableFEVisibleColumnNamesWithSampleRowObject(rowObject, dataSourceDescription);
        // ^ to finalize:
        var idxOf_objTitle = colNames_sansObjectTitle.indexOf(humanReadableColumnName_objectTitle);
        colNames_sansObjectTitle.splice(idxOf_objTitle, 1);
        //
        var alphaSorted_colNames_sansObjectTitle = colNames_sansObjectTitle.sort();
        
        var designatedOriginalImageField = dataSourceDescription.fe_designatedFields.originalImageURL;
        var hasDesignatedOriginalImageField = designatedOriginalImageField ? true : false;
        var rowObjectHasOriginalImage = false;
        if (hasDesignatedOriginalImageField) {
            var valueAtOriginalImageField = rowObject.rowParams[designatedOriginalImageField];
            if (typeof valueAtOriginalImageField !== 'undefined' && valueAtOriginalImageField != null && valueAtOriginalImageField != "") {
                rowObjectHasOriginalImage = true;
            }
        }
        var data =
        {
            arrayTitle: dataSourceDescription.title,
            array_source_key: source_pKey,
            //
            rowObject: rowObject,
            //
            fieldKey_objectTitle: dataSourceDescription.fe_designatedFields.objectTitle,
            //
            fieldKey_originalImageURL: hasDesignatedOriginalImageField ? designatedOriginalImageField : undefined,
            hasOriginalImage: rowObjectHasOriginalImage,
            //
            ordered_colNames_sansObjectTitleAndImages: alphaSorted_colNames_sansObjectTitle
        };
        callback(null, data);
    });
}
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
//
constructor.prototype._rowParamKeysFromSampleRowObject_sansFEExcludedFields = function(sampleRowObject, dataSourceDescription)
{
    var rowParams = sampleRowObject.rowParams;
    var rowParams_keys = Object.keys(rowParams);
    var rowParams_keys_length = rowParams_keys.length;
    var feVisible_rowParams_keys = [];
    for (var i = 0 ; i < rowParams_keys_length ; i++) {
        var key = rowParams_keys[i];
        if (dataSourceDescription.fe_excludeFields) {
            if (dataSourceDescription.fe_excludeFields.indexOf(key) !== -1) {
                continue;
            }
        }
        feVisible_rowParams_keys.push(key);
    }
    
    return feVisible_rowParams_keys;
};
//
constructor.prototype._humanReadableFEVisibleColumnNamesWithSampleRowObject = function(sampleRowObject, dataSourceDescription)
{
    var self = this;
    var rowParams_keys = self._rowParamKeysFromSampleRowObject_sansFEExcludedFields(sampleRowObject, dataSourceDescription);
    // Replace designated object title with "Object Title"
    var designatedObjectTitleKey = dataSourceDescription.fe_designatedFields.objectTitle;
    var indexOfDesignatedObjectTitleKey = rowParams_keys.indexOf(designatedObjectTitleKey); // we presume this is not -1
    rowParams_keys[indexOfDesignatedObjectTitleKey] = humanReadableColumnName_objectTitle; // replace that with "Object Title"
    // Any other titles can be done here (^ factor this if necessary to reuse)
    
    return rowParams_keys;
};
//