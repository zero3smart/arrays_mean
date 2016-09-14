var winston = require('winston');
var Batch = require('batch');
//
var importedDataPreparation = require('../../../datasources/utils/imported_data_preparation');
var import_datatypes = require('../../../datasources/utils/import_datatypes');
var config = new require('../config')();
var functions = new require('../functions')();

var constructor = function(options, context) {
    var self = this;
    self.options = options;
    self.context = context;

    return self;
};

/**
 * Line Graph view action controller.
 * @param {Object} urlQuery - URL params
 * @param {Function} callback
 */
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

    var team = importedDataPreparation.TeamDescription(dataSourceDescription.team_id);

    if (typeof dataSourceDescription.fe_views !== 'undefined' && dataSourceDescription.fe_views.lineGraph != null && dataSourceDescription.fe_views.lineGraph === false) {
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
    var defaultGroupByColumnName_humanReadable = dataSourceDescription.fe_lineGraph_defaultGroupByColumnName_humanReadable;
    //
    var keywordGroupBy = dataSourceDescription.fe_lineGraph_keywordGroupBy;
    var keywordCountBy = dataSourceDescription.fe_lineGraph_keywordCountBy;
    //
    var routePath_base              = "/array/" + source_pKey + "/line-graph";
    var sourceDocURL = dataSourceDescription.urls ? dataSourceDescription.urls.length > 0 ? dataSourceDescription.urls[0] : null : null;
    //
    var truesByFilterValueByFilterColumnName_forWhichNotToOutputColumnNameInPill = functions._new_truesByFilterValueByFilterColumnName_forWhichNotToOutputColumnNameInPill(dataSourceDescription);
    //
    var filterObj = functions.filterObjFromQueryParams(urlQuery);
    var isFilterActive = Object.keys(filterObj).length != 0;
    //
    var searchCol = urlQuery.searchCol;
    var searchQ = urlQuery.searchQ;
    var isSearchActive = typeof searchCol !== 'undefined' && searchCol != null && searchCol != "" // Not only a column
        && typeof searchQ !== 'undefined' && searchQ != null && searchQ != "";  // but a search query

    var groupBy_realColumnName = importedDataPreparation.RealColumnNameFromHumanReadableColumnName(groupBy ? groupBy : defaultGroupByColumnName_humanReadable,
        dataSourceDescription);

    //
    // DataSource Relationship
    var mapping_source_pKey = dataSourceDescription.fe_lineGraph_mapping_dataSource_pKey;
    //var dataSourceRevision_pKey = self.context.raw_source_documents_controller.NewCustomPrimaryKeyStringWithComponents(mapping_dataSource_uid, mapping_dataSource_importRevision);
    if (mapping_source_pKey) {
        var mappingDataSourceDescription = importedDataPreparation.DataSourceDescriptionWithPKey(mapping_source_pKey, self.context.raw_source_documents_controller);

        var mapping_default_filterObj = {};
        if (typeof mappingDataSourceDescription.fe_filters_default !== 'undefined') {
            mapping_default_filterObj = mappingDataSourceDescription.fe_filters_default;
        }
        var mapping_default_view = 'gallery';
        if (typeof mappingDataSourceDescription.fe_default_view !== 'undefined') {
            mapping_default_view = mappingDataSourceDescription.fe_default_view;
        }
        var mapping_groupBy = groupBy_realColumnName;
        if (dataSourceDescription.fe_lineGraph_mapping_dataSource_fields)
            mapping_groupBy = dataSourceDescription.fe_lineGraph_mapping_dataSource_fields[groupBy_realColumnName];
        var mapping_groupByObj = {};
        mapping_groupByObj[mapping_groupBy] = '';
    }

    //
    var sourceDoc, sampleDoc, uniqueFieldValuesByFieldName, groupedResultsByKeyword = {};

    var batch = new Batch();
    batch.concurrency(1);

    // Obtain source document
    batch.push(function(done) {
        self.context.raw_source_documents_controller.Model.findOne({ primaryKey: source_pKey }, function(err, _sourceDoc) {
            if (err) return done(err);

            sourceDoc = _sourceDoc;
            done();
        });
    });

    // Obtain sample document
    batch.push(function(done) {
        processedRowObjects_mongooseModel.findOne({}, function(err, _sampleDoc) {
            if (err) return done(err);

            sampleDoc = _sampleDoc;
            done();
        });
    });

    // Obtain Top Unique Field Values For Filtering
    batch.push(function(done) {
        functions._topUniqueFieldValuesForFiltering(source_pKey, dataSourceDescription, function(err, _uniqueFieldValuesByFieldName) {
            if (err) return done(err);

            uniqueFieldValuesByFieldName = {};
            for (var columnName in _uniqueFieldValuesByFieldName) {
                if (_uniqueFieldValuesByFieldName.hasOwnProperty(columnName)) {
                    var raw_rowObjects_coercionSchema = dataSourceDescription.raw_rowObjects_coercionScheme;
                    if (raw_rowObjects_coercionSchema && raw_rowObjects_coercionSchema[columnName]) {
                        var row = [];
                        _uniqueFieldValuesByFieldName[columnName].forEach(function(rowValue) {
                            row.push(import_datatypes.OriginalValue(raw_rowObjects_coercionSchema[columnName], rowValue));
                        });
                        row.sort();
                        uniqueFieldValuesByFieldName[columnName] = row;
                    } else {
                        uniqueFieldValuesByFieldName[columnName] = _uniqueFieldValuesByFieldName[columnName];
                    }
                }
            }
            done();
        });
    });

    // Obtain Grouped ResultSet
    batch.push(function (done) {
        //
        var aggregationOperators = [];
        if (isSearchActive) {
            var _orErrDesc = functions._activeSearch_matchOp_orErrDescription(dataSourceDescription, searchCol, searchQ);
            if (_orErrDesc.err) return done(_orErrDesc.err);

            aggregationOperators = aggregationOperators.concat(_orErrDesc.matchOps);
        }
        if (isFilterActive) { // rules out undefined filterCol
            var _orErrDesc = functions._activeFilter_matchOp_orErrDescription_fromMultiFilter(dataSourceDescription, filterObj);
            if (_orErrDesc.err) return done(_orErrDesc.err);

            aggregationOperators = aggregationOperators.concat(_orErrDesc.matchOps);
        }

        if (typeof keywordCountBy !== 'undefined' && keywordCountBy !== null && keywordCountBy !== "") {

            if (typeof keywordGroupBy !== 'undefined' && keywordGroupBy !== null && keywordGroupBy !== "") {
                var keywordGroupBy_realColumnName = importedDataPreparation.RealColumnNameFromHumanReadableColumnName(keywordGroupBy, dataSourceDescription);

                aggregationOperators = aggregationOperators.concat(
                    [
                        { $unwind: "$" + "rowParams." + groupBy_realColumnName },
                        { $unwind: "$" + "rowParams." + keywordGroupBy_realColumnName },
                        {
                            $group: {
                                _id: {groupBy: "$" + "rowParams." + groupBy_realColumnName, keywordBy: "$" + "rowParams." + keywordGroupBy_realColumnName},
                                value: { $sum: "$" + "rowParams." + keywordCountBy }
                            }
                        },
                        {
                            $project: {
                                _id: 0,
                                label: "$_id.groupBy",
                                keyword: "$_id.keywordBy",
                                value: 1
                            }
                        },
                        {
                            $sort: { value: -1 } // priotize by incidence, since we're $limit-ing below
                        },
                        {
                            $limit: 100 // so the chart can actually handle the number
                        }
                    ]);

            } else {

                // Count by summing numeric field in group if option in datasource description is set
                aggregationOperators = aggregationOperators.concat(
                    [
                        { $unwind: "$" + "rowParams." + groupBy_realColumnName }, // requires MongoDB 3.2, otherwise throws an error if non-array
                        {
                            $group: {
                                _id: "$" + "rowParams." + groupBy_realColumnName,
                                value: { $sum: "$" + "rowParams." + keywordCountBy }
                            }
                        },
                        {
                            $project: {
                                _id: 0,
                                label: "$_id",
                                value: 1
                            }
                        },
                        {
                            $sort: { value: -1 } // priotize by incidence, since we're $limit-ing below
                        },
                        {
                            $limit: 100 // so the chart can actually handle the number
                        }
                    ]);

            }
        } else {

            // Count by number of records in filter group by default
            aggregationOperators = aggregationOperators.concat(
                [
                    { $unwind: "$" + "rowParams." + groupBy_realColumnName }, // requires MongoDB 3.2, otherwise throws an error if non-array
                    { // unique/grouping and summing stage
                        $group: {
                            _id: "$" + "rowParams." + groupBy_realColumnName,
                            value: { $sum: 1 }
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
                        $sort: { value: -1 }
                    },
                    {
                        $limit: 100 // so the chart can actually handle the number
                    }
                ]);
        }
        
        var doneFn = function(err, _multigroupedResults)
        {
            if (err) return done(err);

            if (_multigroupedResults == undefined || _multigroupedResults == null) _multigroupedResults = [];

            var _multigroupedResults_object = {};
            _multigroupedResults.forEach(function(el) {
                var keyword = el.keyword && el.keyword != '' ? el.keyword : 'default';
                if (_multigroupedResults_object[keyword] === undefined) {
                    _multigroupedResults_object[keyword] = [];
                }
                _multigroupedResults_object[keyword].push(el);
            });

            for (var keyword in _multigroupedResults_object) {
                if (_multigroupedResults_object.hasOwnProperty(keyword)) {
                    var _groupedResults = _multigroupedResults_object[keyword];

                    var finalizedButNotCoalesced_groupedResults = [];
                    _groupedResults.forEach(function(el, i, arr)
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
                    var groupedResults = [];
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
                        groupedResults.push({
                            count: summedValue,
                            year: reconstitutedDisplayableTitle
                        });
                    });

                    if (keywordGroupBy)
                        groupedResultsByKeyword[keyword] = groupedResults;
                    else
                        groupedResultsByKeyword = groupedResults;
                }
            }

            done();
        };

        processedRowObjects_mongooseModel.aggregate(aggregationOperators).allowDiskUse(true)/* or we will hit mem limit on some pages*/.exec(doneFn);
    });

    batch.end(function(err) {
        if (err) return callback(err);

        //
        var data =
        {
            env: process.env,
            //
            arrayTitle: dataSourceDescription.title,
            array_source_key: source_pKey,
            team: team,
            brandColor: dataSourceDescription.brandColor,
            sourceDoc: sourceDoc,
            sourceDocURL: sourceDocURL,
            view_visibility: dataSourceDescription.fe_views ? dataSourceDescription.fe_views : {},
            //
            groupedResultsByKeyword: groupedResultsByKeyword,
            groupBy: groupBy,
            lineColors: dataSourceDescription.fe_lineGraph_keywordLineColors ? dataSourceDescription.fe_lineGraph_keywordLineColors : {},
            //
            filterObj: filterObj,
            isFilterActive: isFilterActive,
            uniqueFieldValuesByFieldName: uniqueFieldValuesByFieldName,
            truesByFilterValueByFilterColumnName_forWhichNotToOutputColumnNameInPill: truesByFilterValueByFilterColumnName_forWhichNotToOutputColumnNameInPill,
            //
            searchQ: searchQ,
            searchCol: searchCol,
            isSearchActive: isSearchActive,
            //
            defaultGroupByColumnName_humanReadable: defaultGroupByColumnName_humanReadable,
            colNames_orderedForGroupByDropdown: importedDataPreparation.HumanReadableFEVisibleColumnNamesWithSampleRowObject_orderedForLineGraphGroupByDropdown(sampleDoc, dataSourceDescription),
            colNames_orderedForSortByDropdown: importedDataPreparation.HumanReadableFEVisibleColumnNamesWithSampleRowObject_orderedForSortByDropdown(sampleDoc, dataSourceDescription),
            //
            routePath_base: routePath_base,
            // datasource relationship
            mapping_source_pKey: mapping_source_pKey,
            mapping_default_filterObj: mapping_default_filterObj,
            mapping_default_view: mapping_default_view,
            mapping_groupByObj: mapping_groupByObj,
            // multiselectable filter fields
            multiselectableFilterFields: dataSourceDescription.fe_filters_fieldsMultiSelectable
        };
        callback(err, data);
    });
};

module.exports = constructor;