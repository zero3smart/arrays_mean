var winston = require('winston');
var async = require('async');
var moment = require('moment');
var fs = require('fs');
//
var importedDataPreparation = require('../../../datasources/utils/imported_data_preparation');
var cached_values_model = require('../../../models/cached_values_model');
var import_datatypes = require('../../../datasources/utils/import_datatypes');
var config = require('../config');
var functions = require('../functions');

var constructor = function(options, context) {
    var self = this;
    self.options = options;
    self.context = context;

    return self;
};

//
constructor.prototype.BindDataFor_array = function(urlQuery, callback)
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
    if (typeof dataSourceDescription.fe_views !== 'undefined' && dataSourceDescription.fe_views.timeline != null && dataSourceDescription.fe_views.timeline === false) {
        callback(new Error('View doesn\'t exist for dataset. UID? urlQuery: ' + JSON.stringify(urlQuery, null, '\t')), null);

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
    var skipNResults = config.timelineGroups * (Math.max(pageNumber, 1) - 1);
    var limitToNResults = config.timelineGroups;
    //
    var groupBy = urlQuery.groupBy; // the human readable col name - real col name derived below
    var defaultGroupByColumnName_humanReadable = dataSourceDescription.fe_timeline_defaultGroupByColumnName_humanReadable;
    var groupBy_realColumnName = importedDataPreparation.RealColumnNameFromHumanReadableColumnName(groupBy ? groupBy : defaultGroupByColumnName_humanReadable, dataSourceDescription);
    var groupedResultsLimit = config.timelineGroupSize;
    var groupsLimit = config.timelineGroups;
    var groupByDateFormat;
    //
    var sortBy = urlQuery.sortBy; // the human readable col name - real col name derived below
    var sortDir = urlQuery.sortDir;
    var sortDirection = sortDir ? sortDir == 'Ascending' ? 1 : -1 : 1;
    var defaultSortByColumnName_humanReadable = dataSourceDescription.fe_timeline_defaultSortByColumnName_humanReadable;
    var sortBy_realColumnName = importedDataPreparation.RealColumnNameFromHumanReadableColumnName(sortBy ? sortBy : defaultSortByColumnName_humanReadable, dataSourceDescription);
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
    // We must re-URI-encode the filter vals since they get decoded
    var filterJSON_uriEncodedVals = functions._new_reconstructedURLEncodedFilterObjAsFilterJSONString(filterObj);
    //
    var searchCol = urlQuery.searchCol;
    var searchQ = urlQuery.searchQ;
    var isSearchActive = typeof searchCol !== 'undefined' && searchCol != null && searchCol != "" // Not only a column
        && typeof searchQ !== 'undefined' && searchQ != null && searchQ != "";  // but a search query
    //
    //
    var wholeFilteredSet_aggregationOperators = [];
    if (isSearchActive) {
        var _orErrDesc = functions._activeSearch_matchOp_orErrDescription(dataSourceDescription, searchCol, searchQ);
        if (typeof _orErrDesc.err !== 'undefined') {
            callback(_orErrDesc.err, null);

            return;
        }
        wholeFilteredSet_aggregationOperators = wholeFilteredSet_aggregationOperators.concat(_orErrDesc.matchOps);
    }
    if (isFilterActive) { // rules out undefined filterJSON
        var _orErrDesc = functions._activeFilter_matchOp_orErrDescription_fromMultiFilter(dataSourceDescription, filterObj);
        if (typeof _orErrDesc.err !== 'undefined') {
            callback(_orErrDesc.err, null);

            return;
        }
        wholeFilteredSet_aggregationOperators = wholeFilteredSet_aggregationOperators.concat(_orErrDesc.matchOps);
    }

    var groupBySortFieldPath = "results.rowParams." + sortBy_realColumnName
    var groupByColumnName = groupBy ? groupBy : defaultGroupByColumnName_humanReadable;
    var groupByDuration;

    switch(groupByColumnName) {
        case 'Decade':
            groupByDuration = moment.duration(10, 'years').asMilliseconds();
            groupByDateFormat = "YYYY";
            break;

        case 'Year':
            groupByDuration = moment.duration(1, 'years').asMilliseconds();
            groupByDateFormat = "YYYY";
            break;

        case 'Month':
            groupByDuration = moment.duration(1, 'months').asMilliseconds();
            groupByDateFormat = "MMMM YYYY";
            break;

        case 'Day':
            groupByDuration = moment.duration(1, 'days').asMilliseconds();
            groupByDateFormat = "MMMM Do YYYY";
            break;

        default:
            groupByDuration = moment.duration(1, 'years').asMilliseconds();
            groupByDateFormat = "YYYY";
    }

    self.context.raw_source_documents_controller.Model.findOne({ primaryKey: source_pKey }, function(err, sourceDoc)
    {
        if (err) {
            return callback(err, null);
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
        functions._topUniqueFieldValuesForFiltering(source_pKey, dataSourceDescription, sampleDoc, function(err, uniqueFieldValuesByFieldName)
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
                    // _id: 1,
                    _id: {
                        "$subtract": [
                            { "$subtract": [ "$" + "rowParams." + sortBy_realColumnName, new Date("1970-01-01") ] },
                            { "$mod": [
                                { "$subtract": [ "$" + "rowParams." + sortBy_realColumnName, new Date("1970-01-01") ] },
                                groupByDuration
                            ]}
                        ]
                    }
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
                nonpagedCount = results.length;
            }
            //
            _proceedTo_obtainGroupedResultSet(sourceDoc, sampleDoc, uniqueFieldValuesByFieldName, nonpagedCount);
        };
        processedRowObjects_mongooseModel.aggregate(countWholeFilteredSet_aggregationOperators).allowDiskUse(true)/* or we will hit mem limit on some pages*/.exec(doneFn);
    }
    function _proceedTo_obtainGroupedResultSet(sourceDoc, sampleDoc, uniqueFieldValuesByFieldName, nonpagedCount)
    {

        var aggregationOperators = [];
        if (isSearchActive) {
            var _orErrDesc = functions._activeSearch_matchOp_orErrDescription(dataSourceDescription, searchCol, searchQ);
            if (typeof _orErrDesc.err !== 'undefined') {
                callback(_orErrDesc.err, null);

                return;
            }
            aggregationOperators = aggregationOperators.concat(_orErrDesc.matchOps);
        }
        if (isFilterActive) { // rules out undefined filterCol
            var _orErrDesc = functions._activeFilter_matchOp_orErrDescription_fromMultiFilter(dataSourceDescription, filterObj);
            if (typeof _orErrDesc.err !== 'undefined') {
                callback(_orErrDesc.err, null);

                return;
            }
            aggregationOperators = aggregationOperators.concat(_orErrDesc.matchOps);
        }

        var sort = {};
        sort[groupBySortFieldPath] = -1;

        var projects = { $project: {
            _id: 1,
            pKey: 1,
            srcDocPKey: 1,
            rowIdxInDoc: 1
        }};

        // Exclude the nested pages fields to reduce the amount of data returned
        var rowParamsfields = Object.keys(sampleDoc.rowParams);
        rowParamsfields.forEach(function(rowParamsField) {
            if (rowParamsField == sortBy_realColumnName || rowParamsField.indexOf(dataSourceDescription.fe_nestedObject_prefix) === -1) {
                projects['$project']['rowParams.' + rowParamsField] = 1;
            }
        });

        aggregationOperators = aggregationOperators.concat(
            [
                projects,
                { $unwind: "$" + "rowParams." + sortBy_realColumnName }, // requires MongoDB 3.2, otherwise throws an error if non-array
                { // unique/grouping and summing stage
                    $group: {
                        _id: {
                            "$subtract": [
                                { "$subtract": [ "$" + "rowParams." + sortBy_realColumnName, new Date("1970-01-01") ] },
                                { "$mod": [
                                    { "$subtract": [ "$" + "rowParams." + sortBy_realColumnName, new Date("1970-01-01") ] },
                                    groupByDuration
                                ]}
                            ]
                        },
                        startDate: { $min: "$" + "rowParams." + sortBy_realColumnName },
                        endDate: { $max: "$" + "rowParams." + sortBy_realColumnName },
                        total: { $sum: 1 }, // the count
                        results: { $push: "$$ROOT" }
                    }
                },
                { // reformat
                    $project: {
                        _id: 0,
                        startDate: 1,
                        endDate: 1,
                        total: 1,
                        results: {$slice: ["$results", groupedResultsLimit]}
                    }
                },
                {
                    $sort: sort
                },
                // Pagination
                { $skip: skipNResults },
                { $limit: groupsLimit }
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
            _prepareDataAndCallBack(sourceDoc, sampleDoc, uniqueFieldValuesByFieldName, nonpagedCount, groupedResults);
        };
        processedRowObjects_mongooseModel.aggregate(aggregationOperators).allowDiskUse(true)/* or we will hit mem limit on some pages*/.exec(doneFn);
    }
    function _prepareDataAndCallBack(sourceDoc, sampleDoc, uniqueFieldValuesByFieldName, nonpagedCount, groupedResults)
    {
        var err = null;
        var hasThumbs = dataSourceDescription.fe_designatedFields.medThumbImageURL ? true : false;
        var routePath_base              = "/array/" + source_pKey + "/timeline";
        var routePath_withoutFilter     = routePath_base;
        var routePath_withoutPage       = routePath_base;
        var routePath_withoutGroupBy    = routePath_base;
        var routePath_withoutSortBy     = routePath_base;
        var routePath_withoutSortDir    = routePath_base;
        var urlQuery_forSwitchingViews  = "";
        var urlQuery_forViewAllInDuration = routePath_base;
        if (groupBy !== undefined && groupBy != null && groupBy !== "") {
            var appendQuery = "groupBy=" + groupBy;
            routePath_withoutFilter     = functions._routePathByAppendingQueryStringToVariationOfBase(routePath_withoutFilter,    appendQuery, routePath_base);
            routePath_withoutPage       = functions._routePathByAppendingQueryStringToVariationOfBase(routePath_withoutPage,      appendQuery, routePath_base);
            routePath_withoutSortBy     = functions._routePathByAppendingQueryStringToVariationOfBase(routePath_withoutSortBy,    appendQuery, routePath_base);
            routePath_withoutSortDir    = functions._routePathByAppendingQueryStringToVariationOfBase(routePath_withoutSortDir,   appendQuery, routePath_base);
        }
        if (sortBy !== undefined && sortBy != null && sortBy !== "") {
            var appendQuery = "sortBy=" + sortBy;
            routePath_withoutGroupBy    = functions._routePathByAppendingQueryStringToVariationOfBase(routePath_withoutGroupBy,   appendQuery, routePath_base);
            routePath_withoutFilter     = functions._routePathByAppendingQueryStringToVariationOfBase(routePath_withoutFilter,    appendQuery, routePath_base);
            routePath_withoutPage       = functions._routePathByAppendingQueryStringToVariationOfBase(routePath_withoutPage,      appendQuery, routePath_base);
            routePath_withoutSortDir    = functions._routePathByAppendingQueryStringToVariationOfBase(routePath_withoutSortDir,   appendQuery, routePath_base);
        }
        if (sortDir !== undefined && sortDir != null && sortDir !== "") {
            var appendQuery = "sortDir=" + sortDir;
            routePath_withoutFilter     = functions._routePathByAppendingQueryStringToVariationOfBase(routePath_withoutFilter,        appendQuery, routePath_base);
            routePath_withoutPage       = functions._routePathByAppendingQueryStringToVariationOfBase(routePath_withoutPage,          appendQuery, routePath_base);
            routePath_withoutSortBy     = functions._routePathByAppendingQueryStringToVariationOfBase(routePath_withoutSortBy,        appendQuery, routePath_base);
            routePath_withoutGroupBy    = functions._routePathByAppendingQueryStringToVariationOfBase(routePath_withoutGroupBy,   appendQuery, routePath_base);
        }
        if (page !== undefined && page != null && page !== "") {
            var appendQuery = "page=" + page;
            routePath_withoutSortBy     = functions._routePathByAppendingQueryStringToVariationOfBase(routePath_withoutSortBy,    appendQuery, routePath_base);
            routePath_withoutSortDir    = functions._routePathByAppendingQueryStringToVariationOfBase(routePath_withoutSortDir,   appendQuery, routePath_base);
            routePath_withoutGroupBy    = functions._routePathByAppendingQueryStringToVariationOfBase(routePath_withoutGroupBy,   appendQuery, routePath_base);
        }
        if (isFilterActive) {
            var appendQuery = "filterJSON=" + filterJSON_uriEncodedVals;
            routePath_withoutGroupBy    = functions._routePathByAppendingQueryStringToVariationOfBase(routePath_withoutGroupBy,   appendQuery, routePath_base);
            routePath_withoutPage       = functions._routePathByAppendingQueryStringToVariationOfBase(routePath_withoutPage,      appendQuery, routePath_base);
            routePath_withoutSortBy     = functions._routePathByAppendingQueryStringToVariationOfBase(routePath_withoutSortBy,    appendQuery, routePath_base);
            routePath_withoutSortDir    = functions._routePathByAppendingQueryStringToVariationOfBase(routePath_withoutSortDir,   appendQuery, routePath_base);
            urlQuery_forSwitchingViews  = functions._urlQueryByAppendingQueryStringToExistingQueryString(urlQuery_forSwitchingViews, appendQuery);
        }
        if (isSearchActive) {
            var appendQuery = "searchCol=" + searchCol + "&" + "searchQ=" + searchQ;
            routePath_withoutFilter     = functions._routePathByAppendingQueryStringToVariationOfBase(routePath_withoutFilter,    appendQuery, routePath_base);
            routePath_withoutGroupBy    = functions._routePathByAppendingQueryStringToVariationOfBase(routePath_withoutGroupBy,   appendQuery, routePath_base);
            routePath_withoutPage       = functions._routePathByAppendingQueryStringToVariationOfBase(routePath_withoutPage,      appendQuery, routePath_base);
            routePath_withoutSortBy     = functions._routePathByAppendingQueryStringToVariationOfBase(routePath_withoutSortBy,    appendQuery, routePath_base);
            routePath_withoutSortDir    = functions._routePathByAppendingQueryStringToVariationOfBase(routePath_withoutSortDir,   appendQuery, routePath_base);
            urlQuery_forSwitchingViews  = functions._urlQueryByAppendingQueryStringToExistingQueryString(urlQuery_forSwitchingViews, appendQuery);
        }
        var sourceDocURL = dataSourceDescription.urls ? dataSourceDescription.urls.length > 0 ? dataSourceDescription.urls[0] : null : null;
        //
        var truesByFilterValueByFilterColumnName_forWhichNotToOutputColumnNameInPill = functions._new_truesByFilterValueByFilterColumnName_forWhichNotToOutputColumnNameInPill(dataSourceDescription);
        //
        var data =
        {
            env: process.env,
            //
            arrayTitle: dataSourceDescription.title,
            array_source_key: source_pKey,
            brandColor: dataSourceDescription.brandColor,
            sourceDoc: sourceDoc,
            sourceDocURL: sourceDocURL,
            view_visibility: dataSourceDescription.fe_views ? dataSourceDescription.fe_views : {},
            //
            pageSize: config.timelineGroups < nonpagedCount ? config.pageSize : nonpagedCount,
            onPageNum: pageNumber,
            numPages: Math.ceil(nonpagedCount / config.timelineGroups),
            nonpagedCount: nonpagedCount,
            //
            fieldKey_objectTitle: dataSourceDescription.fe_designatedFields.objectTitle,
            humanReadableColumnName_objectTitle: importedDataPreparation.HumanReadableColumnName_objectTitle,
            //
            hasThumbs: hasThumbs,
            fieldKey_medThumbImageURL: hasThumbs ? dataSourceDescription.fe_designatedFields.medThumbImageURL : undefined,
            //
            groupedResults: groupedResults,
            groupBy: groupBy,
            groupBy_realColumnName: groupBy_realColumnName,
            groupedResultsLimit: groupedResultsLimit,
            groupByDateFormat: groupByDateFormat,
            //
            sortBy: sortBy,
            sortDir: sortDir,
            defaultSortByColumnName_humanReadable: defaultSortByColumnName_humanReadable,
            sortBy_realColumnName: sortBy_realColumnName,
            colNames_orderedForTimelineSortByDropdown: importedDataPreparation.HumanReadableFEVisibleColumnNamesWithSampleRowObject_orderedForTimelineSortByDropdown(sampleDoc, dataSourceDescription),
            colNames_orderedForSortByDropdown: importedDataPreparation.HumanReadableFEVisibleColumnNamesWithSampleRowObject_orderedForSortByDropdown(sampleDoc, dataSourceDescription),
            //
            filterObj: filterObj,
            filterJSON_nonURIEncodedVals: filterJSON,
            filterJSON: filterJSON_uriEncodedVals,
            isFilterActive: isFilterActive,
            uniqueFieldValuesByFieldName: uniqueFieldValuesByFieldName,
            truesByFilterValueByFilterColumnName_forWhichNotToOutputColumnNameInPill: truesByFilterValueByFilterColumnName_forWhichNotToOutputColumnNameInPill,
            //
            searchQ: searchQ,
            searchCol: searchCol,
            isSearchActive: isSearchActive,
            //
            defaultGroupByColumnName_humanReadable: defaultGroupByColumnName_humanReadable,
            colNames_orderedForGroupByDropdown: dataSourceDescription.fe_timeline_durationsAvailableForGroupBy ? dataSourceDescription.fe_timeline_durationsAvailableForGroupBy : {},
            //
            routePath_base: routePath_base,
            routePath_withoutFilter: routePath_withoutFilter,
            routePath_withoutPage: routePath_withoutPage,
            routePath_withoutGroupBy: routePath_withoutGroupBy,
            routePath_withoutSortBy: routePath_withoutSortBy,
            routePath_withoutSortDir: routePath_withoutSortDir,
            //
            urlQuery_forSwitchingViews: urlQuery_forSwitchingViews,
            urlQuery_forViewAllInDuration: urlQuery_forViewAllInDuration
        };
        callback(err, data);
    }
};

module.exports = constructor;