//
//
////////////////////////////////////////////////////////////////////////////////
// Imports
//
var winston = require('winston');
var async = require('async');
var fs = require('fs');
//
var dataSourceDescriptions = require('../data_ingestion/MVP_datasource_descriptions').Descriptions;
var importedDataPreparation = require('../data_ingestion/imported_data_preparation');
var cached_values_model = require('../cached_values/cached_values_model');
//
//
////////////////////////////////////////////////////////////////////////////////
// Constants/Caches
//
var pageSize = 250;
//
// Prepare country geo data cache
var __countries_geo_json_str = fs.readFileSync(__dirname + '/resources/countries.geo.json', 'utf8');
var __countries_geo_json = JSON.parse(__countries_geo_json_str);
var cache_countryGeometryByLowerCasedCountryName = {};
var numCountries = __countries_geo_json.features.length;
for (var i = 0 ; i < numCountries ; i++) {
    var countryFeature = __countries_geo_json.features[i];
    var countryName = countryFeature.properties.name;
    var geometry = countryFeature.geometry;
    cache_countryGeometryByLowerCasedCountryName[countryName.toLowerCase()] = geometry;
    // console.log(countryName + ": ", geometry);
}
winston.info("💬  Cached " + Object.keys(cache_countryGeometryByLowerCasedCountryName).length + " geometries by country name.");
// console.log("cache_countryGeometryByLowerCasedCountryName " , cache_countryGeometryByLowerCasedCountryName);
__countries_geo_json_str = undefined; // free
__countries_geo_json = undefined; // free
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
        var source_pKey = importedDataPreparation.DataSourcePKeyFromDataSourceDescription(dataSourceDescription, self.context.raw_source_documents_controller);
        self._fetchedSourceDoc(source_pKey, function(err, doc)
        {
            if (err) {
                callback(err, null);
            
                return;
            }
            var default_filterJSON = undefined;
            if (typeof dataSourceDescription.fe_filters_default !== 'undefined') {
                default_filterJSON = JSON.stringify(dataSourceDescription.fe_filters_default || {}); // "|| {}" for safety
            }
            var sourceDescription = 
            {
                key: source_pKey,
                sourceDoc: doc,
                title: dataSourceDescription.title,
                description: dataSourceDescription.description,
                urls: dataSourceDescription.urls,
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
//
constructor.prototype.PageSize = function() { return pageSize; };
//
//
constructor.prototype.BindDataFor_array_gallery = function(urlQuery, callback)
{
    var self = this;
    // urlQuery keys:
        // source_key
        // page
        // sortBy
        // sortDir
        // filterJSON
        // searchQ
        // searchCol
    var source_pKey = urlQuery.source_key;
    var dataSourceDescription = importedDataPreparation.DataSourceDescriptionWithPKey(source_pKey, self.context.raw_source_documents_controller);
    if (dataSourceDescription == null || typeof dataSourceDescription === 'undefined') {
        callback(new Error("No data source with that source pkey " + source_pKey), null);
        
        return;
    }
    var fe_visible = dataSourceDescription.fe_visible;
    if (typeof fe_visible !== 'undefined' && fe_visible != null && fe_visible === false) {
        callback(new Error("That data source was set to be not visible: " + source_pKey), null);
        
        return;
    }
    var processedRowObjects_mongooseContext = self.context.processed_row_objects_controller.Lazy_Shared_ProcessedRowObject_MongooseContext(source_pKey);
    var processedRowObjects_mongooseModel = processedRowObjects_mongooseContext.Model;
    //
    var page = urlQuery.page;
    var pageNumber = page ? page : 1;
    var skipNResults = pageSize * (Math.max(pageNumber, 1) - 1);
    var limitToNResults = pageSize;
    //
    var sortBy = urlQuery.sortBy; // the human readable col name - real col name derived below
    var sortDir = urlQuery.sortDir;
    var sortDirection = sortDir ? sortDir == 'Ascending' ? 1 : -1 : 1;
    //
    var filterJSON = urlQuery.filterJSON;
    var filterObj = {};
    var isFilterActive = false;
    if (typeof filterJSON !== 'undefined' && filterJSON != null && filterJSON.length != 0) {
        try {
            filterObj = JSON.parse(filterJSON);
            if (typeof filterObj !== 'undefined' && filterObj != null && Object.keys(filterObj) != 0) {
                isFilterActive = true;
            } else {
                filterObj = {}; // must replace it to prevent errors below
            }
        } catch (e) {
            winston.error("❌  Error parsing filterJSON: ", filterJSON);
            callback(e, null);
            
            return;
        }
    }
    //
    var searchCol = urlQuery.searchCol;
    var searchQ = urlQuery.searchQ;
    var isSearchActive = typeof searchCol !== 'undefined' && searchCol != null && searchCol != "" // Not only a column
                      && typeof searchQ !== 'undefined' && searchQ != null && searchQ != "";  // but a search query
    //
    var wholeFilteredSet_aggregationOperators = [];
    if (isSearchActive) { 
        var _orErrDesc = _activeSearch_matchOp_orErrDescription(dataSourceDescription, searchCol, searchQ);
        if (typeof _orErrDesc.err !== 'undefined') {
            callback(_orErrDesc.err, null);
            
            return;
        }
        wholeFilteredSet_aggregationOperators.push(_orErrDesc.matchOp);
    }
    if (isFilterActive) { // rules out undefined filterJSON
        var _orErrDesc = _activeFilter_matchOp_orErrDescription_fromMultiFilterWithLogicalOperator(dataSourceDescription, filterObj, "$and");
        if (typeof _orErrDesc.err !== 'undefined') {
            callback(_orErrDesc.err, null);
            
            return;
        }
        wholeFilteredSet_aggregationOperators.push(_orErrDesc.matchOp);
    }
    //
    // Now kick off the query work
    self._fetchedSourceDoc(source_pKey, function(err, sourceDoc)
    {
        if (err) {
            callback(err, null);
        
            return;
        }
        _proceedTo_obtainSampleDocument(sourceDoc);
    });
    function _proceedTo_obtainSampleDocument(sourceDoc)
    {
        processedRowObjects_mongooseModel.findOne({}, function(err, sampleDoc)
        {
            if (err) {
                callback(err, null);
            
                return;
            }
            if (sampleDoc == null) {
                callback(new Error('Unexpectedly missing sample document - wrong data source UID? urlQuery: ' + JSON.stringify(urlQuery, null, '\t')), null);
                
                return;
            }
            //
            _proceedTo_obtainTopUniqueFieldValuesForFiltering(sourceDoc, sampleDoc);
        });
    }
    function _proceedTo_obtainTopUniqueFieldValuesForFiltering(sourceDoc, sampleDoc)
    {
        _topUniqueFieldValuesForFiltering(source_pKey, dataSourceDescription, sampleDoc, function(err, uniqueFieldValuesByFieldName)
        {
            if (err) {
                callback(err, null);

                return;
            }
            //
            _proceedTo_countWholeSet(sourceDoc, sampleDoc, uniqueFieldValuesByFieldName);
        });
    }
    function _proceedTo_countWholeSet(sourceDoc, sampleDoc, uniqueFieldValuesByFieldName)
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
            if (results == undefined || results == null || results.length == 0) { // 0
            } else {
                nonpagedCount = results[0].count;
            }
            //
            _proceedTo_obtainPagedDocs(sourceDoc, sampleDoc, uniqueFieldValuesByFieldName, nonpagedCount);
        };
        processedRowObjects_mongooseModel.aggregate(countWholeFilteredSet_aggregationOperators).exec(doneFn);
    }
    function _proceedTo_obtainPagedDocs(sourceDoc, sampleDoc, uniqueFieldValuesByFieldName, nonpagedCount)
    {        
        var sortBy_realColumnName = importedDataPreparation.RealColumnNameFromHumanReadableColumnName(sortBy ? sortBy : importedDataPreparation.HumanReadableColumnName_objectTitle, 
                                                                                                      dataSourceDescription);
        var sortBy_realColumnName_path = "rowParams." + sortBy_realColumnName;
        var sortOpParams = {};
        sortOpParams[sortBy_realColumnName_path] = sortDirection;
        //
        var pagedDocs_aggregationOperators = wholeFilteredSet_aggregationOperators.concat([
            // Sort (before pagination):
            { $sort: sortOpParams },
            // Pagination
            { $skip: skipNResults },
            { $limit: limitToNResults }
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
            //        
            _prepareDataAndCallBack(sourceDoc, sampleDoc, uniqueFieldValuesByFieldName, nonpagedCount, docs);
        };
        processedRowObjects_mongooseModel.aggregate(pagedDocs_aggregationOperators).allowDiskUse(true)/* or we will hit mem limit on some pages*/.exec(doneFn);
    }
    function _prepareDataAndCallBack(sourceDoc, sampleDoc, uniqueFieldValuesByFieldName, nonpagedCount, docs)
    {
        var err = null;
        var hasThumbs = dataSourceDescription.fe_designatedFields.medThumbImageURL ? true : false;
        var routePath_base              = "/array/" + source_pKey + "/gallery";
        var routePath_withoutFilter     = routePath_base;
        var routePath_withoutPage       = routePath_base;
        var routePath_withoutSortBy     = routePath_base;
        var routePath_withoutSortDir    = routePath_base;
        var urlQuery_forSwitchingViews  = "";
        if (sortBy !== undefined && sortBy != null && sortBy !== "") {
            var appendQuery = "sortBy=" + sortBy;
            routePath_withoutFilter     = _routePathByAppendingQueryStringToVariationOfBase(routePath_withoutFilter,    appendQuery, routePath_base);
            routePath_withoutPage       = _routePathByAppendingQueryStringToVariationOfBase(routePath_withoutPage,      appendQuery, routePath_base);
            routePath_withoutSortDir    = _routePathByAppendingQueryStringToVariationOfBase(routePath_withoutSortDir,   appendQuery, routePath_base);
        }
        if (sortDir !== undefined && sortDir != null && sortDir !== "") {
            var appendQuery = "sortDir=" + sortDir;
            routePath_withoutFilter     = _routePathByAppendingQueryStringToVariationOfBase(routePath_withoutFilter,        appendQuery, routePath_base);
            routePath_withoutPage       = _routePathByAppendingQueryStringToVariationOfBase(routePath_withoutPage,          appendQuery, routePath_base);
            routePath_withoutSortBy     = _routePathByAppendingQueryStringToVariationOfBase(routePath_withoutSortBy,        appendQuery, routePath_base);
        }
        if (page !== undefined && page != null && page !== "") {
            var appendQuery = "page=" + page;
            routePath_withoutSortBy     = _routePathByAppendingQueryStringToVariationOfBase(routePath_withoutSortBy,    appendQuery, routePath_base);
            routePath_withoutSortDir    = _routePathByAppendingQueryStringToVariationOfBase(routePath_withoutSortDir,   appendQuery, routePath_base);
        }
        if (isFilterActive) {
            var appendQuery = "filterJSON=" + filterJSON;
            routePath_withoutPage       = _routePathByAppendingQueryStringToVariationOfBase(routePath_withoutPage,      appendQuery, routePath_base);
            routePath_withoutSortBy     = _routePathByAppendingQueryStringToVariationOfBase(routePath_withoutSortBy,    appendQuery, routePath_base);
            routePath_withoutSortDir    = _routePathByAppendingQueryStringToVariationOfBase(routePath_withoutSortDir,   appendQuery, routePath_base);
            urlQuery_forSwitchingViews  = _urlQueryByAppendingQueryStringToExistingQueryString(urlQuery_forSwitchingViews, appendQuery);
        }
        if (isSearchActive) {
            var appendQuery = "searchCol=" + searchCol + "&" + "searchQ=" + searchQ;
            routePath_withoutFilter     = _routePathByAppendingQueryStringToVariationOfBase(routePath_withoutFilter,    appendQuery, routePath_base);
            routePath_withoutPage       = _routePathByAppendingQueryStringToVariationOfBase(routePath_withoutPage,      appendQuery, routePath_base);
            routePath_withoutSortBy     = _routePathByAppendingQueryStringToVariationOfBase(routePath_withoutSortBy,    appendQuery, routePath_base);
            routePath_withoutSortDir    = _routePathByAppendingQueryStringToVariationOfBase(routePath_withoutSortDir,   appendQuery, routePath_base);
            urlQuery_forSwitchingViews  = _urlQueryByAppendingQueryStringToExistingQueryString(urlQuery_forSwitchingViews, appendQuery);
        }
        //
        var truesByFilterValueByFilterColumnName_forWhichNotToOutputColumnNameInPill = _new_truesByFilterValueByFilterColumnName_forWhichNotToOutputColumnNameInPill(dataSourceDescription);
        //
        var data =
        {
            env: process.env,
            //
            arrayTitle: dataSourceDescription.title,
            array_source_key: source_pKey,
            sourceDoc: sourceDoc,
            sourceDocURL: dataSourceDescription.urls ? dataSourceDescription.urls.length > 0 ? dataSourceDescription.urls[0] : null : null,
            //
            pageSize: pageSize < nonpagedCount ? pageSize : nonpagedCount,
            onPageNum: pageNumber,
            numPages: Math.ceil(nonpagedCount / pageSize),
            nonpagedCount: nonpagedCount,
            //
            docs: docs,
            //
            fieldKey_objectTitle: dataSourceDescription.fe_designatedFields.objectTitle,
            humanReadableColumnName_objectTitle: importedDataPreparation.HumanReadableColumnName_objectTitle,
            //
            hasThumbs: hasThumbs,
            fieldKey_medThumbImageURL: hasThumbs ? dataSourceDescription.fe_designatedFields.medThumbImageURL : undefined,
            //
            sortBy: sortBy,
            sortDir: sortDir,
            colNames_orderedForSortByDropdown: importedDataPreparation.HumanReadableFEVisibleColumnNamesWithSampleRowObject_orderedForSortByDropdown(sampleDoc, dataSourceDescription),
            //
            filterObj: filterObj,
            filterJSON: filterJSON,
            isFilterActive: isFilterActive,
            uniqueFieldValuesByFieldName: uniqueFieldValuesByFieldName,
            truesByFilterValueByFilterColumnName_forWhichNotToOutputColumnNameInPill: truesByFilterValueByFilterColumnName_forWhichNotToOutputColumnNameInPill,
            //
            fe_galleryItem_htmlForIconFromRowObjWhenMissingImage: dataSourceDescription.fe_galleryItem_htmlForIconFromRowObjWhenMissingImage,
            //
            searchQ: searchQ,
            searchCol: searchCol,
            isSearchActive: isSearchActive,
            //
            routePath_base: routePath_base,
            routePath_withoutFilter: routePath_withoutFilter,
            routePath_withoutPage: routePath_withoutPage,
            routePath_withoutSortBy: routePath_withoutSortBy,
            routePath_withoutSortDir: routePath_withoutSortDir,
            //
            urlQuery_forSwitchingViews: urlQuery_forSwitchingViews
        };
        callback(err, data);
    }
};
//
constructor.prototype.BindDataFor_array_chart = function(urlQuery, callback)
{
    var self = this;
    // urlQuery keys:
        // source_key
        // groupBy
        // filterJSON
        // searchQ
        // searchCol
    var source_pKey = urlQuery.source_key;
    var dataSourceDescription = importedDataPreparation.DataSourceDescriptionWithPKey(source_pKey, self.context.raw_source_documents_controller);
    if (dataSourceDescription == null || typeof dataSourceDescription === 'undefined') {
        callback(new Error("No data source with that source pkey " + source_pKey), null);
        
        return;
    }
    var fe_visible = dataSourceDescription.fe_visible;
    if (typeof fe_visible !== 'undefined' && fe_visible != null && fe_visible === false) {
        callback(new Error("That data source was set to be not visible: " + source_pKey), null);
        
        return;
    }
    var processedRowObjects_mongooseContext = self.context.processed_row_objects_controller.Lazy_Shared_ProcessedRowObject_MongooseContext(source_pKey);
    var processedRowObjects_mongooseModel = processedRowObjects_mongooseContext.Model;
    //
    var groupBy = urlQuery.groupBy; // the human readable col name - real col name derived below
    var defaultGroupByColumnName_humanReadable = dataSourceDescription.fe_chart_defaultGroupByColumnName_humanReadable;
    //
    var filterJSON = urlQuery.filterJSON;
    var filterObj = {};
    var isFilterActive = false;
    if (typeof filterJSON !== 'undefined' && filterJSON != null && filterJSON.length != 0) {
        try {
            filterObj = JSON.parse(filterJSON);
            if (typeof filterObj !== 'undefined' && filterObj != null && Object.keys(filterObj) != 0) {
                isFilterActive = true;
            } else {
                filterObj = {}; // must replace it to prevent errors below
            }
        } catch (e) {
            winston.error("❌  Error parsing filterJSON: ", filterJSON);
            callback(e, null);
            
            return;
        }
    }
    //
    var searchCol = urlQuery.searchCol;
    var searchQ = urlQuery.searchQ;
    var isSearchActive = typeof searchCol !== 'undefined' && searchCol != null && searchCol != "" // Not only a column
                      && typeof searchQ !== 'undefined' && searchQ != null && searchQ != "";  // but a search query
    //
    // Now kick off the query work
    self._fetchedSourceDoc(source_pKey, function(err, sourceDoc)
    {
        if (err) {
            callback(err, null);

            return;
        }
        _proceedTo_obtainSampleDocument(sourceDoc);
    });
    function _proceedTo_obtainSampleDocument(sourceDoc)
    {
        processedRowObjects_mongooseModel.findOne({}, function(err, sampleDoc)
        {
            if (err) {
                callback(err, null);
            
                return;
            }
            if (sampleDoc == null) {
                callback(new Error('Unexpectedly missing sample document - wrong data source UID? urlQuery: ' + JSON.stringify(urlQuery, null, '\t')), null);
                
                return;
            }        
            _proceedTo_obtainTopUniqueFieldValuesForFiltering(sourceDoc, sampleDoc);
        });
    }
    function _proceedTo_obtainTopUniqueFieldValuesForFiltering(sourceDoc, sampleDoc)
    {
        _topUniqueFieldValuesForFiltering(source_pKey, dataSourceDescription, sampleDoc, function(err, uniqueFieldValuesByFieldName)
        {
            if (err) {
                callback(err, null);

                return;
            }
            //
            _proceedTo_obtainGroupedResultSet(sourceDoc, sampleDoc, uniqueFieldValuesByFieldName);
        });
    }
    function _proceedTo_obtainGroupedResultSet(sourceDoc, sampleDoc, uniqueFieldValuesByFieldName)
    {
        var groupBy_realColumnName = importedDataPreparation.RealColumnNameFromHumanReadableColumnName(groupBy ? groupBy : defaultGroupByColumnName_humanReadable, 
                                                                                                       dataSourceDescription);
        //
        var aggregationOperators = [];
        if (isSearchActive) { 
            var _orErrDesc = _activeSearch_matchOp_orErrDescription(dataSourceDescription, searchCol, searchQ);
            if (typeof _orErrDesc.err !== 'undefined') {
                callback(_orErrDesc.err, null);
            
                return;
            }
            aggregationOperators.push(_orErrDesc.matchOp);
        }
        if (isFilterActive) { // rules out undefined filterCol
            var _orErrDesc = _activeFilter_matchOp_orErrDescription_fromMultiFilterWithLogicalOperator(dataSourceDescription, filterObj, "$and");
            if (typeof _orErrDesc.err !== 'undefined') {
                callback(_orErrDesc.err, null);
            
                return;
            }
            aggregationOperators.push(_orErrDesc.matchOp);
        }
        aggregationOperators = aggregationOperators.concat(
        [
            { // unique/grouping and summing stage
                $group: {
                    _id: "$" + "rowParams." + groupBy_realColumnName,
                    value: { $sum: 1 } // the count
                }
            },
            { // reformat
                $project: {
                    _id: 0,
                    label: "$_id",
                    value: 1
                }
            },
            { // priotize by incidence, since we're $limit-ing below 
                $sort : { value : -1 } 
            },
            { 
                $limit : 100 // so the chart can actually handle the number
            }
        ]);
        //
        var doneFn = function(err, groupedResults)
        {
            if (err) {
                callback(err, null);
            
                return;
            }
            if (groupedResults == undefined || groupedResults == null) {
                groupedResults = [];
            }
            var finalizedButNotCoalesced_groupedResults = [];
            groupedResults.forEach(function(el, i, arr) 
            {
                var originalVal = el.label;
                //
                var fe_chart_valuesToExcludeByOriginalKey = dataSourceDescription.fe_chart_valuesToExcludeByOriginalKey;
                if (fe_chart_valuesToExcludeByOriginalKey != null && typeof fe_chart_valuesToExcludeByOriginalKey !== 'undefined') {
                    if (fe_chart_valuesToExcludeByOriginalKey._all) {
                        if (fe_chart_valuesToExcludeByOriginalKey._all.indexOf(originalVal) !== -1) {
                            return; // do not push to list
                        }
                    }
                    var illegalValuesForThisKey = fe_chart_valuesToExcludeByOriginalKey[groupBy_realColumnName];
                    if (illegalValuesForThisKey) {
                        if (illegalValuesForThisKey.indexOf(originalVal) !== -1) {
                            return; // do not push to list
                        }
                    }
                }
                //
                var displayableVal = originalVal;
                if (originalVal == null) {
                    displayableVal = "(null)"; // null breaks chart but we don't want to lose its data
                } else if (originalVal === "") {
                    displayableVal = "(not specified)"; // we want to show a label for it rather than it appearing broken by lacking a label
                } else {
                    displayableVal = _reverseDataTypeCoersionToMakeFEDisplayableValFrom(originalVal, groupBy_realColumnName, dataSourceDescription);
                }
                finalizedButNotCoalesced_groupedResults.push({ 
                    value: el.value, 
                    label: displayableVal 
                });
            });
            var finalized_groupedResults = [];
            var summedValuesByLowercasedLabels = {};
            var titleWithMostMatchesAndMatchCountByLowercasedTitle = {};
            finalizedButNotCoalesced_groupedResults.forEach(function(el, i, arr) 
            {
                var label = el.label;
                var value = el.value;
                var label_toLowerCased = label.toLowerCase();
                //
                var existing_valueSum = summedValuesByLowercasedLabels[label_toLowerCased] || 0;
                var new_valueSum = existing_valueSum + value;
                summedValuesByLowercasedLabels[label_toLowerCased] = new_valueSum;
                //
                var existing_titleWithMostMatchesAndMatchCount = titleWithMostMatchesAndMatchCountByLowercasedTitle[label_toLowerCased] || { label: '', value: -1 };
                if (existing_titleWithMostMatchesAndMatchCount.value < value) {
                    var new_titleWithMostMatchesAndMatchCount = { label: label, value: value };
                    titleWithMostMatchesAndMatchCountByLowercasedTitle[label_toLowerCased] = new_titleWithMostMatchesAndMatchCount;
                }
            });
            var lowercasedLabels = Object.keys(summedValuesByLowercasedLabels);
            lowercasedLabels.forEach(function(key, i, arr) 
            {
                var summedValue = summedValuesByLowercasedLabels[key];
                var reconstitutedDisplayableTitle = key;
                var titleWithMostMatchesAndMatchCount = titleWithMostMatchesAndMatchCountByLowercasedTitle[key];
                if (typeof titleWithMostMatchesAndMatchCount === 'undefined') {
                    winston.error("❌  This should never be undefined.");
                    callback(new Error('Unexpectedly undefined title with most matches'), null);
                    
                    return;
                } else {
                    reconstitutedDisplayableTitle = titleWithMostMatchesAndMatchCount.label;
                }
                finalized_groupedResults.push({ 
                    value: summedValue, 
                    label: reconstitutedDisplayableTitle 
                });
            });
            _prepareDataAndCallBack(sourceDoc, sampleDoc, uniqueFieldValuesByFieldName, finalized_groupedResults);
        };
        processedRowObjects_mongooseModel.aggregate(aggregationOperators).allowDiskUse(true)/* or we will hit mem limit on some pages*/.exec(doneFn);
    }
    function _prepareDataAndCallBack(sourceDoc, sampleDoc, uniqueFieldValuesByFieldName, groupedResults)
    {
        var err = null;
        var routePath_base              = "/array/" + source_pKey + "/chart";
        var routePath_withoutFilter     = routePath_base;
        var routePath_withoutGroupBy    = routePath_base;
        var urlQuery_forSwitchingViews  = "";
        if (groupBy !== undefined && groupBy != null && groupBy !== "") {
            var appendQuery = "groupBy=" + groupBy;
            routePath_withoutFilter     = _routePathByAppendingQueryStringToVariationOfBase(routePath_withoutFilter,    appendQuery, routePath_base);
        }
        if (isFilterActive) {
            var appendQuery = "filterJSON=" + filterJSON;
            routePath_withoutGroupBy    = _routePathByAppendingQueryStringToVariationOfBase(routePath_withoutGroupBy,   appendQuery, routePath_base);
            urlQuery_forSwitchingViews  = _urlQueryByAppendingQueryStringToExistingQueryString(urlQuery_forSwitchingViews, appendQuery);
        }
        if (isSearchActive) {
            var appendQuery = "searchCol=" + searchCol + "&" + "searchQ=" + searchQ;
            routePath_withoutFilter     = _routePathByAppendingQueryStringToVariationOfBase(routePath_withoutFilter,    appendQuery, routePath_base);
            routePath_withoutGroupBy    = _routePathByAppendingQueryStringToVariationOfBase(routePath_withoutGroupBy,   appendQuery, routePath_base);
            urlQuery_forSwitchingViews  = _urlQueryByAppendingQueryStringToExistingQueryString(urlQuery_forSwitchingViews, appendQuery);
        }
        var sourceDocURL = dataSourceDescription.urls ? dataSourceDescription.urls.length > 0 ? dataSourceDescription.urls[0] : null : null;
        //
        var truesByFilterValueByFilterColumnName_forWhichNotToOutputColumnNameInPill = _new_truesByFilterValueByFilterColumnName_forWhichNotToOutputColumnNameInPill(dataSourceDescription);
        //
        var data =
        {
            env: process.env,
            //
            arrayTitle: dataSourceDescription.title,
            array_source_key: source_pKey,
            sourceDoc: sourceDoc,
            sourceDocURL: sourceDocURL,
            //
            groupedResults: groupedResults,
            groupBy: groupBy,
            //
            filterObj: filterObj,
            filterJSON: filterJSON,
            isFilterActive: isFilterActive,
            uniqueFieldValuesByFieldName: uniqueFieldValuesByFieldName,
            truesByFilterValueByFilterColumnName_forWhichNotToOutputColumnNameInPill: truesByFilterValueByFilterColumnName_forWhichNotToOutputColumnNameInPill,
            //
            searchQ: searchQ,
            searchCol: searchCol,
            isSearchActive: isSearchActive,
            //
            defaultGroupByColumnName_humanReadable: defaultGroupByColumnName_humanReadable,
            colNames_orderedForGroupByDropdown: importedDataPreparation.HumanReadableFEVisibleColumnNamesWithSampleRowObject_orderedForChartGroupByDropdown(sampleDoc, dataSourceDescription),
            colNames_orderedForSortByDropdown: importedDataPreparation.HumanReadableFEVisibleColumnNamesWithSampleRowObject_orderedForSortByDropdown(sampleDoc, dataSourceDescription),
            //
            routePath_base: routePath_base,
            routePath_withoutFilter: routePath_withoutFilter,
            routePath_withoutGroupBy: routePath_withoutGroupBy,
            //
            urlQuery_forSwitchingViews: urlQuery_forSwitchingViews
        };
        callback(err, data);
    }
};
//
constructor.prototype.BindDataFor_array_choropleth = function(urlQuery, callback)
{
    var self = this;
    // urlQuery keys:
        // source_key
        // mapBy
        // filterJSON
        // searchQ
        // searchCol
    var source_pKey = urlQuery.source_key;
    var dataSourceDescription = importedDataPreparation.DataSourceDescriptionWithPKey(source_pKey, self.context.raw_source_documents_controller);
    if (dataSourceDescription == null || typeof dataSourceDescription === 'undefined') {
        callback(new Error("No data source with that source pkey " + source_pKey), null);
        
        return;
    }
    var fe_visible = dataSourceDescription.fe_visible;
    if (typeof fe_visible !== 'undefined' && fe_visible != null && fe_visible === false) {
        callback(new Error("That data source was set to be not visible: " + source_pKey), null);
        
        return;
    }
    var processedRowObjects_mongooseContext = self.context.processed_row_objects_controller.Lazy_Shared_ProcessedRowObject_MongooseContext(source_pKey);
    var processedRowObjects_mongooseModel = processedRowObjects_mongooseContext.Model;
    //
    var mapBy = urlQuery.mapBy; // the human readable col name - real col name derived below
    var defaultMapByColumnName_humanReadable = dataSourceDescription.fe_choropleth_defaultMapByColumnName_humanReadable;
    //
    var filterJSON = urlQuery.filterJSON;
    var filterObj = {};
    var isFilterActive = false;
    if (typeof filterJSON !== 'undefined' && filterJSON != null && filterJSON.length != 0) {
        try {
            filterObj = JSON.parse(filterJSON);
            if (typeof filterObj !== 'undefined' && filterObj != null && Object.keys(filterObj) != 0) {
                isFilterActive = true;
            } else {
                filterObj = {}; // must replace it to prevent errors below
            }
        } catch (e) {
            winston.error("❌  Error parsing filterJSON: ", filterJSON);
            callback(e, null);
            
            return;
        }
    }
    //
    var searchCol = urlQuery.searchCol;
    var searchQ = urlQuery.searchQ;
    var isSearchActive = typeof searchCol !== 'undefined' && searchCol != null && searchCol != "" // Not only a column
                      && typeof searchQ !== 'undefined' && searchQ != null && searchQ != "";  // but a search query
    //
    // Now kick off the query work
    self._fetchedSourceDoc(source_pKey, function(err, sourceDoc)
    {
        if (err) {
            callback(err, null);

            return;
        }
        _proceedTo_obtainSampleDocument(sourceDoc);
    });
    function _proceedTo_obtainSampleDocument(sourceDoc)
    {
        processedRowObjects_mongooseModel.findOne({}, function(err, sampleDoc)
        {
            if (err) {
                callback(err, null);
            
                return;
            }
            if (sampleDoc == null) {
                callback(new Error('Unexpectedly missing sample document - wrong data source UID? urlQuery: ' + JSON.stringify(urlQuery, null, '\t')), null);
                
                return;
            }        
            _proceedTo_obtainTopUniqueFieldValuesForFiltering(sourceDoc, sampleDoc);
        });
    }
    function _proceedTo_obtainTopUniqueFieldValuesForFiltering(sourceDoc, sampleDoc)
    {
        _topUniqueFieldValuesForFiltering(source_pKey, dataSourceDescription, sampleDoc, function(err, uniqueFieldValuesByFieldName)
        {
            if (err) {
                callback(err, null);

                return;
            }
            //
            _proceedTo_obtainGroupedResultSet(sourceDoc, sampleDoc, uniqueFieldValuesByFieldName);
        });
    }
    function _proceedTo_obtainGroupedResultSet(sourceDoc, sampleDoc, uniqueFieldValuesByFieldName)
    {
        var mapBy_realColumnName = importedDataPreparation.RealColumnNameFromHumanReadableColumnName(mapBy ? mapBy : defaultMapByColumnName_humanReadable, 
                                                                                                     dataSourceDescription);
        //
        var aggregationOperators = [];
        if (isSearchActive) { 
            var _orErrDesc = _activeSearch_matchOp_orErrDescription(dataSourceDescription, searchCol, searchQ);
            if (typeof _orErrDesc.err !== 'undefined') {
                callback(_orErrDesc.err, null);
            
                return;
            }
            aggregationOperators.push(_orErrDesc.matchOp);
        }
        if (isFilterActive) { // rules out undefined filterCol
            var _orErrDesc = _activeFilter_matchOp_orErrDescription_fromMultiFilterWithLogicalOperator(dataSourceDescription, filterObj, "$and");
            if (typeof _orErrDesc.err !== 'undefined') {
                callback(_orErrDesc.err, null);
            
                return;
            }
            aggregationOperators.push(_orErrDesc.matchOp);
        }        
        aggregationOperators = aggregationOperators.concat(
        [
            { // unique/grouping and summing stage
                $group: {
                    _id: "$" + "rowParams." + mapBy_realColumnName,
                    total: { $sum: 1 } // the count
                }
            },
            { // reformat
                $project: {
                    _id: 0,
                    name: "$_id",
                    total: 1
                }
            }
        ]);
        //
        var doneFn = function(err, groupedResults)
        {
            if (err) {
                callback(err, null);
            
                return;
            }
            if (groupedResults == undefined || groupedResults == null) {
                groupedResults = [];
            }
            var mapFeatures = [];
            var highestValue = 0;
            groupedResults.forEach(function(el, i, arr) 
            {
                var countryName = el.name;
                if (countryName == null) {
                    return; // skip
                }
                var countAtCountry = el.total;
                if (countAtCountry > highestValue) {
                    highestValue = countAtCountry;
                }
                var countAtCountry_str = "" + countAtCountry;
                var geometryForCountry = cache_countryGeometryByLowerCasedCountryName[countryName.toLowerCase()];
                if (typeof geometryForCountry === 'undefined') {
                    winston.warn("⚠️  No known geometry for country named \"" + countryName + "\"");
                    
                    return;
                }
                mapFeatures.push({
                    type: "Feature",
                    id: "" + i,
                    properties: {
                        name: countryName, 
                        total: parseInt(countAtCountry_str)
                    },
                    geometry: geometryForCountry
                });
            });
            // console.log("mapFeatures " ,mapFeatures)
            _prepareDataAndCallBack(sourceDoc, sampleDoc, uniqueFieldValuesByFieldName, mapFeatures, highestValue);
        };
        processedRowObjects_mongooseModel.aggregate(aggregationOperators).allowDiskUse(true)/* or we will hit mem limit on some pages*/.exec(doneFn);
    }
    function _prepareDataAndCallBack(sourceDoc, sampleDoc, uniqueFieldValuesByFieldName, mapFeatures, highestValue)
    {
        var err = null;
        var routePath_base              = "/array/" + source_pKey + "/choropleth";
        var routePath_withoutFilter     = routePath_base;
        var routePath_withoutMapBy      = routePath_base;
        var urlQuery_forSwitchingViews  = "";
        if (mapBy !== undefined && mapBy != null && mapBy !== "") {
            var appendQuery = "mapBy=" + mapBy;
            routePath_withoutFilter     = _routePathByAppendingQueryStringToVariationOfBase(routePath_withoutFilter,    appendQuery, routePath_base);
        }
        if (isFilterActive) {
            var appendQuery = "filterJSON=" + filterJSON;
            routePath_withoutMapBy      = _routePathByAppendingQueryStringToVariationOfBase(routePath_withoutMapBy,     appendQuery, routePath_base);
            urlQuery_forSwitchingViews  = _urlQueryByAppendingQueryStringToExistingQueryString(urlQuery_forSwitchingViews, appendQuery);
        }
        if (isSearchActive) {
            var appendQuery = "searchCol=" + searchCol + "&" + "searchQ=" + searchQ;
            routePath_withoutFilter     = _routePathByAppendingQueryStringToVariationOfBase(routePath_withoutFilter,    appendQuery, routePath_base);
            routePath_withoutMapBy      = _routePathByAppendingQueryStringToVariationOfBase(routePath_withoutMapBy,     appendQuery, routePath_base);
            urlQuery_forSwitchingViews  = _urlQueryByAppendingQueryStringToExistingQueryString(urlQuery_forSwitchingViews, appendQuery);
        }
        //
        var sourceDocURL = dataSourceDescription.urls ? dataSourceDescription.urls.length > 0 ? dataSourceDescription.urls[0] : null : null;
        //
        var truesByFilterValueByFilterColumnName_forWhichNotToOutputColumnNameInPill = _new_truesByFilterValueByFilterColumnName_forWhichNotToOutputColumnNameInPill(dataSourceDescription);
        //
        var data =
        {
            env: process.env,
            //
            arrayTitle: dataSourceDescription.title,
            array_source_key: source_pKey,
            sourceDoc: sourceDoc,
            sourceDocURL: sourceDocURL,
            //
            highestValue: highestValue,
            featureCollection: {
                type: "FeatureCollection",
                features: mapFeatures
            },
            mapBy: mapBy,
            //
            filterObj: filterObj,
            filterJSON: filterJSON,
            isFilterActive: isFilterActive,
            uniqueFieldValuesByFieldName: uniqueFieldValuesByFieldName,
            truesByFilterValueByFilterColumnName_forWhichNotToOutputColumnNameInPill: truesByFilterValueByFilterColumnName_forWhichNotToOutputColumnNameInPill,
            //
            searchQ: searchQ,
            searchCol: searchCol,
            isSearchActive: isSearchActive,
            //
            defaultMapByColumnName_humanReadable: defaultMapByColumnName_humanReadable,
            colNames_orderedForMapByDropdown: importedDataPreparation.HumanReadableFEVisibleColumnNamesWithSampleRowObject_orderedForChoroplethMapByDropdown(sampleDoc, dataSourceDescription),
            colNames_orderedForSortByDropdown: importedDataPreparation.HumanReadableFEVisibleColumnNamesWithSampleRowObject_orderedForSortByDropdown(sampleDoc, dataSourceDescription),
            //
            routePath_base: routePath_base,
            routePath_withoutFilter: routePath_withoutFilter,
            routePath_withoutMapBy: routePath_withoutMapBy,
            //
            urlQuery_forSwitchingViews: urlQuery_forSwitchingViews
        };
        callback(err, data);
    }
};
//
constructor.prototype.BindDataFor_array_objectDetails = function(source_pKey, rowObject_id, callback)
{
    var self = this;
    var dataSourceDescription = importedDataPreparation.DataSourceDescriptionWithPKey(source_pKey, self.context.raw_source_documents_controller);
    var fe_visible = dataSourceDescription.fe_visible;
    if (typeof fe_visible !== 'undefined' && fe_visible != null && fe_visible === false) {
        callback(new Error("That data source was set to be not visible: " + source_pKey), null);
        
        return;
    }
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
        //
        var fieldsNotToLinkAsGalleryFilter_byColName = {}; // we will translate any original keys to human-readable later
        var fe_filters_fieldsNotAvailable = dataSourceDescription.fe_filters_fieldsNotAvailable;
        if (typeof fe_filters_fieldsNotAvailable !== 'undefined') {
            var fe_filters_fieldsNotAvailable_length = fe_filters_fieldsNotAvailable.length;
            for (var i = 0 ; i < fe_filters_fieldsNotAvailable_length ; i++) {
                var key = fe_filters_fieldsNotAvailable[i];
                fieldsNotToLinkAsGalleryFilter_byColName[key] = true;
            }
        }
        //
        // Format any coerced fields as necessary - BEFORE we translate the keys into human readable forms
        var rowParams = rowObject.rowParams;
        var rowParams_keys = Object.keys(rowParams);
        var rowParams_keys_length = rowParams_keys.length;
        for (var i = 0 ; i < rowParams_keys_length ; i++) {
            var key = rowParams_keys[i];
            var originalVal = rowParams[key];
            var displayableVal = _reverseDataTypeCoersionToMakeFEDisplayableValFrom(originalVal, key, dataSourceDescription);
            rowParams[key] = displayableVal;
        }
        //
        var colNames_sansObjectTitle = importedDataPreparation.HumanReadableFEVisibleColumnNamesWithSampleRowObject(rowObject, dataSourceDescription);
        // ^ to finalize:
        var idxOf_objTitle = colNames_sansObjectTitle.indexOf(importedDataPreparation.HumanReadableColumnName_objectTitle);
        colNames_sansObjectTitle.splice(idxOf_objTitle, 1);
        //
        var alphaSorted_colNames_sansObjectTitle = colNames_sansObjectTitle.sort();
        //
        var designatedOriginalImageField = dataSourceDescription.fe_designatedFields.originalImageURL;
        var hasDesignatedOriginalImageField = designatedOriginalImageField ? true : false;
        var rowObjectHasOriginalImage = false;
        if (hasDesignatedOriginalImageField) {
            var valueAtOriginalImageField = rowObject.rowParams[designatedOriginalImageField];
            if (typeof valueAtOriginalImageField !== 'undefined' && valueAtOriginalImageField != null && valueAtOriginalImageField != "") {
                rowObjectHasOriginalImage = true;
            }
        }
        //
        // Move the data structures to the human-readable keys so they are accessible by the template
        var fe_displayTitleOverrides = dataSourceDescription.fe_displayTitleOverrides || {};
        var originalKeys = Object.keys(fe_displayTitleOverrides);
        var originalKeys_length = originalKeys.length;
        for (var i = 0 ; i < originalKeys_length ; i++) {
            var originalKey = originalKeys[i];
            var overrideTitle = fe_displayTitleOverrides[originalKey];
            //
            var valueAtOriginalKey = rowObject.rowParams[originalKey];
            rowObject.rowParams[overrideTitle] = valueAtOriginalKey;
            //
            if (fieldsNotToLinkAsGalleryFilter_byColName[originalKey] == true) {
                delete fieldsNotToLinkAsGalleryFilter_byColName[originalKey];
                fieldsNotToLinkAsGalleryFilter_byColName[overrideTitle] = true; // replace with human-readable
            }
        }
        //
        var default_filterJSON = undefined;
        if (typeof dataSourceDescription.fe_filters_default !== 'undefined') {
            default_filterJSON = JSON.stringify(dataSourceDescription.fe_filters_default || {}); // "|| {}" for safety
        }
        //
        var data =
        {
            env: process.env,
            //
            arrayTitle: dataSourceDescription.title,
            array_source_key: source_pKey,
            default_filterJSON: default_filterJSON,
            //
            rowObject: rowObject,
            //
            fieldKey_objectTitle: dataSourceDescription.fe_designatedFields.objectTitle,
            //
            fieldKey_originalImageURL: hasDesignatedOriginalImageField ? designatedOriginalImageField : undefined,
            hasOriginalImage: rowObjectHasOriginalImage,
            //
            ordered_colNames_sansObjectTitleAndImages: alphaSorted_colNames_sansObjectTitle,
            //
            fieldsNotToLinkAsGalleryFilter_byColName: fieldsNotToLinkAsGalleryFilter_byColName
        };
        callback(null, data);
    });
}
//
//
constructor.prototype._fetchedSourceDoc = function(source_pKey, callback)
{
    var self = this;
    self.context.raw_source_documents_controller.Model.findOne({ primaryKey: source_pKey }, function(err, doc)
    {
        if (err) {
            callback(err, null);
            //
            return;
        }
        if (doc == null) {
            callback(new Error('Unexpectedly missing source document - wrong source document pKey? source_pKey: ' + source_pKey), null);
            //
            return;
        }
        //
        callback(null, doc);
    });
}
//
//
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
function _urlQueryByAppendingQueryStringToExistingQueryString(existingQueryString, queryStringToAppend)
{
    var newWholeQueryString = existingQueryString;
    if (existingQueryString.length == 0) {
        newWholeQueryString += "?";
    } else {
        newWholeQueryString += "&";
    }
    newWholeQueryString += queryStringToAppend;
    
    return newWholeQueryString;
}
//
//
//
function _activeFilter_matchOp_orErrDescription_fromMultiFilterWithLogicalOperator(dataSourceDescription, filterObj, mongoDBLogicalOperator)
{
    var filterCols = Object.keys(filterObj);
    var filterCols_length = filterCols.length;
    if (filterCols_length == 0) {
        winston.error("❌  Programmer runtime check error. Filter obj had no keys.");
        
        return { err: new Error("No active filter despite filterObj") };
    }
    var conditions = [];
    for (var i = 0 ; i < filterCols_length ; i++) {
        var filterCol = filterCols[i];
        var filterVals = filterObj[filterCol];
        var filterVals_length = filterVals.length;
        for (var j = 0 ; j < filterVals_length ; j++) {
            var filterVal = filterVals[j];
            var matchCondition = _activeFilter_matchCondition_orErrDescription(dataSourceDescription, filterCol, filterVal);
            if (typeof matchCondition.err !== 'undefined') {
                return { err: matchCondition.err };
            }
            conditions.push(matchCondition.matchCondition);
        }
    }
    if (conditions.length == 0) {
        winston.error("❌  Programmer runtime check error. No match conditions in multifilter for filter obj: ", filterObj);
        
        return { err: new Error("No match conditions in multifilter despite filterObj") };
    }
    var matchOp = { $match: {} };
    matchOp["$match"]["" + (mongoDBLogicalOperator || "$and")] = conditions;
    
    return { matchOp: matchOp };
}

function _activeFilter_matchCondition_orErrDescription(dataSourceDescription, filterCol, filterVal)
{
    var matchCondition = undefined;
    var isAFabricatedFilter = false; // finalize
    if (dataSourceDescription.fe_filters_fabricatedFilters) {
        var fabricatedFilters_length = dataSourceDescription.fe_filters_fabricatedFilters.length;
        for (var i = 0 ; i < fabricatedFilters_length ; i++) {
            var fabricatedFilter = dataSourceDescription.fe_filters_fabricatedFilters[i];
            if (fabricatedFilter.title === filterCol) {
                isAFabricatedFilter = true;
                // Now find the applicable filter choice
                var choices = fabricatedFilter.choices;
                var choices_length = choices.length;
                var foundChoice = false;
                for (var j = 0 ; j < choices_length ; j++) {
                    var choice = choices[j];
                    if (choice.title === filterVal) {
                        foundChoice = true;
                        matchCondition = choice["$match"];
                        
                        break; // found the applicable filter choice
                    }
                }
                if (foundChoice == false) { // still not found despite the filter col being recognized as fabricated
                    return { err: new Error("No such choice \"" + filterVal + "\" for filter " + filterCol) };
                }
                
                break; // found the applicable fabricated filter
            }
        }
    }
    if (isAFabricatedFilter == true) { // already obtained matchCondition just above
        if (typeof matchCondition === 'undefined') {
            return { err: new Error("Unexpectedly missing matchCondition given fabricated filter…" + JSON.stringify(urlQuery)) };
        }
    } else {
        var realColumnName = importedDataPreparation.RealColumnNameFromHumanReadableColumnName(filterCol, dataSourceDescription);
        var realColumnName_path = "rowParams." + realColumnName;
        var realFilterValue = filterVal; // To finalize in case of override…
        var oneToOneOverrideWithValuesByTitleByFieldName = dataSourceDescription.fe_filters_oneToOneOverrideWithValuesByTitleByFieldName || {};
        var oneToOneOverrideWithValuesByTitle_forThisColumn = oneToOneOverrideWithValuesByTitleByFieldName[realColumnName];
        if (oneToOneOverrideWithValuesByTitle_forThisColumn) {
            var overrideValue = oneToOneOverrideWithValuesByTitle_forThisColumn[filterVal];
            if (typeof overrideValue === 'undefined') {
                var errString = "Missing override value for overridden column " + realColumnName + " and incoming filterVal " + filterVal;
                winston.error("❌  " + errString); // we'll just use the value they entered - maybe a user is manually editing the URL
             } else {
                 realFilterValue = overrideValue;
             }
        }
        matchCondition = { };
        matchCondition[realColumnName_path] = { $regex: realFilterValue, $options: "i" };
    }
    if (typeof matchCondition === 'undefined') {
        throw new Error("Undefined match condition");
    }
    
    return { matchCondition: matchCondition };
}
//
function _activeSearch_matchOp_orErrDescription(dataSourceDescription, searchCol, searchQ)
{ // returns dictionary with err or matchOp
    var realColumnName_path = "rowParams." + importedDataPreparation.RealColumnNameFromHumanReadableColumnName(searchCol, dataSourceDescription);
    var matchOp = { $match: {} };
    matchOp["$match"][realColumnName_path] = { $regex: searchQ, $options: "i" };

    return { matchOp: matchOp };
}
//
function _topUniqueFieldValuesForFiltering(source_pKey, dataSourceDescription, sampleDoc, callback)
{
    cached_values_model.MongooseModel.findOne({ srcDocPKey: source_pKey }, function(err, doc) 
    {
        if (err) {
            callback(err, null);

            return;
        }
        if (doc == null) {
            callback(new Error('Missing cached values document for srcDocPKey: ' + source_pKey), null);

            return;
        }
        var uniqueFieldValuesByFieldName = doc.limitedUniqValsByHumanReadableColName;
        if (uniqueFieldValuesByFieldName == null || typeof uniqueFieldValuesByFieldName === 'undefined') {
            callback(new Error('Unexpectedly missing uniqueFieldValuesByFieldName for srcDocPKey: ' + source_pKey), null);

            return;
        }
        //
        // Now insert fabricated filters
        if (dataSourceDescription.fe_filters_fabricatedFilters) {
            var fabricatedFilters_length = dataSourceDescription.fe_filters_fabricatedFilters.length;
            for (var i = 0 ; i < fabricatedFilters_length ; i++) {
                var fabricatedFilter = dataSourceDescription.fe_filters_fabricatedFilters[i];
                var choices = fabricatedFilter.choices;
                var choices_length = choices.length;
                var values = [];
                for (var j = 0 ; j < choices_length ; j++) {
                    var choice = choices[j];
                    values.push(choice.title);
                }
                if (typeof uniqueFieldValuesByFieldName[fabricatedFilter.title] !== 'undefined') {
                    var errStr = 'Unexpectedly already-existent filter for the fabricated filter title ' + fabricatedFilter.title;
                    winston.error("❌  " + errStr);
                    callback(new Error(errStr), null);

                    return;
                }
                uniqueFieldValuesByFieldName[fabricatedFilter.title] = values;
            }
        }
        //
        callback(null, uniqueFieldValuesByFieldName);            
    });
}
//
//
var moment = require('moment');
var _defaultFormat = "MMMM Do, YYYY";
var import_datatypes = require('../data_ingestion/import_datatypes');
//
function _reverseDataTypeCoersionToMakeFEDisplayableValFrom(originalVal, key, dataSourceDescription)
{
    var displayableVal = originalVal;
    // var prototypeName = Object.prototype.toString.call(originalVal);
    // if (prototypeName === '[object Date]') {
    // }
    // ^ We could check this but we ought to have the info, and checking the
    // coersion scheme will make this function slightly more rigorous.
    // Perhaps we could do some type-introspection automated formatting later
    // here if needed, but I think generally that kind of thing would be done case-by-case
    // in the template, such as comma-formatting numbers.
    var raw_rowObjects_coercionScheme = dataSourceDescription.raw_rowObjects_coercionScheme;
    if (raw_rowObjects_coercionScheme && typeof raw_rowObjects_coercionScheme !== 'undefined') {
        var coersionSchemeOfKey = raw_rowObjects_coercionScheme["" + key];
        if (coersionSchemeOfKey && typeof coersionSchemeOfKey !== 'undefined') {
            var _do = coersionSchemeOfKey.do;
            if (_do === import_datatypes.Coercion_ops.ToDate) {
                if (originalVal == null || originalVal == "") {
                    return originalVal; // do not attempt to format
                }
                var dateFormat = null;
                var fe_outputInFormat = dataSourceDescription.fe_outputInFormat;
                if (fe_outputInFormat && typeof fe_outputInFormat !== 'undefined') {
                    var outputInFormat_ofKey = fe_outputInFormat["" + key];
                    if (outputInFormat_ofKey && typeof outputInFormat_ofKey !== 'undefined') {
                        dateFormat = outputInFormat_ofKey.format || null; // || null to hit check below
                    }
                }
                if (dateFormat == null) { // still null - no specific ovrride, so check initial coersion
                    var opts = coersionSchemeOfKey.opts;
                    if (opts && typeof opts !== 'undefined') {
                        dateFormat = opts.format;
                    }
                }
                if (dateFormat == null) { // still null? use default
                    dateFormat = _defaultFormat;
                }
                displayableVal = moment(originalVal).format(dateFormat);
            } else { // nothing to do? (no other types yet)                
            }
        } else { // nothing to do?
        }
    } else { // nothing to do?
    }
    //
    return displayableVal;
}
//
function _new_truesByFilterValueByFilterColumnName_forWhichNotToOutputColumnNameInPill(dataSourceDescription)
{
    var truesByFilterValueByFilterColumnName_forWhichNotToOutputColumnNameInPill = {};
    var fe_filters_fabricatedFilters = dataSourceDescription.fe_filters_fabricatedFilters;
    if (typeof fe_filters_fabricatedFilters !== 'undefined') {
        var fe_filters_fabricatedFilters_length = fe_filters_fabricatedFilters.length;
        for (var i = 0 ; i < fe_filters_fabricatedFilters_length ; i++) {
            var fabricatedFilter = fe_filters_fabricatedFilters[i];
            var filterCol = fabricatedFilter.title;
            truesByFilterValueByFilterColumnName_forWhichNotToOutputColumnNameInPill[filterCol] = {};
            var choices = fabricatedFilter.choices;
            var choices_length = choices.length;
            if (choices_length == 1) { // then we do not want to display the filter col key for this one
                for (var j = 0 ; j < choices_length ; j++) {
                    var choice = choices[j];
                    var filterVal = choice.title;
                    truesByFilterValueByFilterColumnName_forWhichNotToOutputColumnNameInPill[filterCol][filterVal] = true;
                }
            }
        }
    }
    
    return truesByFilterValueByFilterColumnName_forWhichNotToOutputColumnNameInPill;
}
//