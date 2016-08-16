var winston = require('winston');
var async = require('async');
var moment = require('moment');
var fs = require('fs');
//
var importedDataPreparation = require('../../../datasources/utils/imported_data_preparation');
var cached_values_model = require('../../../models/cached_values_model');
var import_datatypes = require('../../../datasources/utils/import_datatypes');
var config = new require('../config')();
var functions = new require('../functions')();

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
    if (typeof dataSourceDescription.fe_views !== 'undefined' && dataSourceDescription.fe_views.chart != null && dataSourceDescription.fe_views.chart === false) {
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
    // We must re-URI-encode the filter vals since they get decoded
    var filterJSON_uriEncodedVals = functions._new_reconstructedURLEncodedFilterObjAsFilterJSONString(filterObj);
    //
    var searchCol = urlQuery.searchCol;
    var searchQ = urlQuery.searchQ;
    var isSearchActive = typeof searchCol !== 'undefined' && searchCol != null && searchCol != "" // Not only a column
        && typeof searchQ !== 'undefined' && searchQ != null && searchQ != "";  // but a search query
    //
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
        aggregationOperators = aggregationOperators.concat(
            [
                { $unwind: "$" + "rowParams." + groupBy_realColumnName }, // requires MongoDB 3.2, otherwise throws an error if non-array
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
                    displayableVal = functions._reverseDataTypeCoersionToMakeFEDisplayableValFrom(originalVal, groupBy_realColumnName, dataSourceDescription);
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
            routePath_withoutFilter     = functions._routePathByAppendingQueryStringToVariationOfBase(routePath_withoutFilter,    appendQuery, routePath_base);
        }
        if (isFilterActive) {
            var appendQuery = "filterJSON=" + filterJSON_uriEncodedVals;
            routePath_withoutGroupBy    = functions._routePathByAppendingQueryStringToVariationOfBase(routePath_withoutGroupBy,   appendQuery, routePath_base);
            urlQuery_forSwitchingViews  = functions._urlQueryByAppendingQueryStringToExistingQueryString(urlQuery_forSwitchingViews, appendQuery);
        }
        if (isSearchActive) {
            var appendQuery = "searchCol=" + searchCol + "&" + "searchQ=" + searchQ;
            routePath_withoutFilter     = functions._routePathByAppendingQueryStringToVariationOfBase(routePath_withoutFilter,    appendQuery, routePath_base);
            routePath_withoutGroupBy    = functions._routePathByAppendingQueryStringToVariationOfBase(routePath_withoutGroupBy,   appendQuery, routePath_base);
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
            groupedResults: groupedResults,
            groupBy: groupBy,
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

module.exports = constructor;