var winston = require('winston');
var Batch = require('batch');

var importedDataPreparation = require('../../../datasources/utils/imported_data_preparation');
var import_datatypes = require('../../../datasources/utils/import_datatypes');
var raw_source_documents = require('../../../models/raw_source_documents');
var processed_row_objects = require('../../../models/processed_row_objects');
var config = require('../config');
var func = require('../func');

module.exports.BindData = function (req, urlQuery, callback) {
    var self = this;
    // urlQuery keys:
    // source_key
    // groupBy
    // searchQ
    // searchCol
    // Other filters
    var source_pKey = urlQuery.source_key;
    var dataSourceDescription = importedDataPreparation.DataSourceDescriptionWithPKey(source_pKey);
    if (dataSourceDescription == null || typeof dataSourceDescription === 'undefined') {
        callback(new Error("No data source with that source pkey " + source_pKey), null);

        return;
    }

    var team = importedDataPreparation.TeamDescription(dataSourceDescription.team_id);

    if (typeof dataSourceDescription.fe_views !== 'undefined' && dataSourceDescription.fe_views.chart != true) {
        callback(new Error('View doesn\'t exist for dataset. UID? urlQuery: ' + JSON.stringify(urlQuery, null, '\t')), null);

        return;
    }
    var fe_visible = dataSourceDescription.fe_visible;
    if (typeof fe_visible !== 'undefined' && fe_visible != null && fe_visible === false) {
        callback(new Error("That data source was set to be not visible: " + source_pKey), null);

        return;
    }
    var processedRowObjects_mongooseContext = processed_row_objects.Lazy_Shared_ProcessedRowObject_MongooseContext(source_pKey);
    var processedRowObjects_mongooseModel = processedRowObjects_mongooseContext.Model;
    //
    var groupBy = urlQuery.groupBy; // the human readable col name - real col name derived below
    var defaultGroupByColumnName_humanReadable = dataSourceDescription.fe_chart_defaultGroupByColumnName_humanReadable;
    var groupBy_realColumnName = importedDataPreparation.RealColumnNameFromHumanReadableColumnName(groupBy ? groupBy : defaultGroupByColumnName_humanReadable,
        dataSourceDescription);
    var raw_rowObjects_coercionSchema = dataSourceDescription.raw_rowObjects_coercionScheme;
    //
    var routePath_base = "/array/" + source_pKey + "/chart";
    var sourceDocURL = dataSourceDescription.urls ? dataSourceDescription.urls.length > 0 ? dataSourceDescription.urls[0] : null : null;
    //
    var truesByFilterValueByFilterColumnName_forWhichNotToOutputColumnNameInPill = func.new_truesByFilterValueByFilterColumnName_forWhichNotToOutputColumnNameInPill(dataSourceDescription);
    //
    var filterObj = func.filterObjFromQueryParams(urlQuery);
    var isFilterActive = Object.keys(filterObj).length != 0;
    //
    var searchCol = urlQuery.searchCol;
    var searchQ = urlQuery.searchQ;
    var isSearchActive = typeof searchCol !== 'undefined' && searchCol != null && searchCol != "" // Not only a column
        && typeof searchQ !== 'undefined' && searchQ != null && searchQ != "";  // but a search query

    // Aggregate By
    var aggregateBy = urlQuery.aggregateBy;
    var defaultAggregateByColumnName_humanReadable = dataSourceDescription.fe_chart_defaultAggregateByColumnName_humanReadable;
    var numberOfRecords_notAvailable = dataSourceDescription.fe_chart_aggregateByColumnName_numberOfRecords_notAvailable;
    if (!defaultAggregateByColumnName_humanReadable && !numberOfRecords_notAvailable)
        defaultAggregateByColumnName_humanReadable = config.aggregateByDefaultColumnName;

    // Aggregate By Available
    var aggregateBy_humanReadable_available = undefined;
    for (var colName in raw_rowObjects_coercionSchema) {
        var colValue = raw_rowObjects_coercionSchema[colName];
        if (colValue.do == import_datatypes.Coercion_ops.ToInteger) {
            var humanReadableColumnName = colName;
            if (dataSourceDescription.fe_displayTitleOverrides && dataSourceDescription.fe_displayTitleOverrides[colName])
                humanReadableColumnName = dataSourceDescription.fe_displayTitleOverrides[colName];

            if (!aggregateBy_humanReadable_available) {
                aggregateBy_humanReadable_available = [];
                if (!numberOfRecords_notAvailable)
                    aggregateBy_humanReadable_available.push(config.aggregateByDefaultColumnName); // Add the default - aggregate by number of records.
            }

            aggregateBy_humanReadable_available.push(humanReadableColumnName);
        }
    }
    if (aggregateBy_humanReadable_available) {
        if (aggregateBy_humanReadable_available.length > 0)
            defaultAggregateByColumnName_humanReadable = aggregateBy_humanReadable_available[0];
        if (aggregateBy_humanReadable_available.length == 1)
            aggregateBy_humanReadable_available = undefined;
    }

    var aggregateBy_realColumnName = importedDataPreparation.RealColumnNameFromHumanReadableColumnName(aggregateBy ? aggregateBy : defaultAggregateByColumnName_humanReadable, dataSourceDescription);

    //
    var sourceDoc, sampleDoc, uniqueFieldValuesByFieldName, groupedResults = [];

    var batch = new Batch();
    batch.concurrency(1);

    // Obtain source document
    batch.push(function (done) {
        raw_source_documents.Model.findOne({primaryKey: source_pKey}, function (err, _sourceDoc) {
            if (err) return done(err);

            sourceDoc = _sourceDoc;
            done();
        });
    });

    // Obtain sample document
    batch.push(function (done) {
        processedRowObjects_mongooseModel.findOne({}, function (err, _sampleDoc) {
            if (err) return done(err);

            sampleDoc = _sampleDoc;
            done();
        });
    });

    // Obtain Top Unique Field Values For Filtering
    batch.push(function (done) {
        func.topUniqueFieldValuesForFiltering(source_pKey, dataSourceDescription, function (err, _uniqueFieldValuesByFieldName) {
            if (err) return done(err);

            uniqueFieldValuesByFieldName = {};
            for (var columnName in _uniqueFieldValuesByFieldName) {
                if (_uniqueFieldValuesByFieldName.hasOwnProperty(columnName)) {
                    var raw_rowObjects_coercionSchema = dataSourceDescription.raw_rowObjects_coercionScheme;
                    if (raw_rowObjects_coercionSchema && raw_rowObjects_coercionSchema[columnName]) {
                        var row = [];
                        _uniqueFieldValuesByFieldName[columnName].forEach(function (rowValue) {
                            row.push(import_datatypes.OriginalValue(raw_rowObjects_coercionSchema[columnName], rowValue));
                        });
                        row.sort();
                        uniqueFieldValuesByFieldName[columnName] = row;
                    } else {
                        uniqueFieldValuesByFieldName[columnName] = _uniqueFieldValuesByFieldName[columnName];
                    }

                    if (dataSourceDescription.fe_filters_fieldsSortableByInteger && dataSourceDescription.fe_filters_fieldsSortableByInteger.indexOf(columnName) != -1) { // Sort by integer

                        uniqueFieldValuesByFieldName[columnName].sort(function (a, b) {
                            a = a.replace(/\D/g, '');
                            a = a == '' ? 0 : parseInt(a);
                            b = b.replace(/\D/g, '');
                            b = b == '' ? 0 : parseInt(b);
                            return a - b;
                        });

                    } else // Sort alphabetically by default
                        uniqueFieldValuesByFieldName[columnName].sort(function (a, b) {
                            return a - b;
                        });
                }
            }
            done();
        });
    });

    // Obtain Grouped ResultSet
    batch.push(function (done) {
        var aggregationOperators = [];
        if (isSearchActive) {
            var _orErrDesc = func.activeSearch_matchOp_orErrDescription(dataSourceDescription, searchCol, searchQ);
            if (_orErrDesc.err) return done(_orErrDesc.err);

            aggregationOperators = aggregationOperators.concat(_orErrDesc.matchOps);
        }
        if (isFilterActive) { // rules out undefined filterCol
            var _orErrDesc = func.activeFilter_matchOp_orErrDescription_fromMultiFilter(dataSourceDescription, filterObj);
            if (_orErrDesc.err)  return done(_orErrDesc.err);

            aggregationOperators = aggregationOperators.concat(_orErrDesc.matchOps);
        }

        if (typeof aggregateBy_realColumnName !== 'undefined' && aggregateBy_realColumnName !== null && aggregateBy_realColumnName !== "" && aggregateBy_realColumnName != config.aggregateByDefaultColumnName) {
            aggregationOperators = aggregationOperators.concat(
                [
                    {$unwind: "$" + "rowParams." + groupBy_realColumnName},
                    {$unwind: "$" + "rowParams." + aggregateBy_realColumnName},
                    { // unique/grouping and summing stage
                        $group: {
                            _id: "$" + "rowParams." + groupBy_realColumnName,
                            value: {$sum: "$" + "rowParams." + aggregateBy_realColumnName} // the count
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
                        $sort: {value: -1}
                    }
                ]);
        } else {
            aggregationOperators = aggregationOperators.concat(
                [
                    {$unwind: "$" + "rowParams." + groupBy_realColumnName}, // requires MongoDB 3.2, otherwise throws an error if non-array
                    { // unique/grouping and summing stage
                        $group: {
                            _id: "$" + "rowParams." + groupBy_realColumnName,
                            value: {$sum: 1} // the count
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
                        $sort: {value: -1}
                    }
                ]);
        }

        //
        var doneFn = function (err, _groupedResults) {
            if (err) return done(err);

            if (_groupedResults == undefined || _groupedResults == null) _groupedResults = [];
            var finalizedButNotCoalesced_groupedResults = [];
            _groupedResults.forEach(function (el, i, arr) {
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
                    displayableVal = func.reverseDataToBeDisplayableVal(originalVal, groupBy_realColumnName, dataSourceDescription);
                }
                finalizedButNotCoalesced_groupedResults.push({
                    value: el.value,
                    label: displayableVal
                });
            });

            var summedValuesByLowercasedLabels = {};
            var titleWithMostMatchesAndMatchCountByLowercasedTitle = {};
            finalizedButNotCoalesced_groupedResults.forEach(function (el, i, arr) {
                var label = el.label;
                var value = el.value;
                var label_toLowerCased = label.toLowerCase();
                //
                var existing_valueSum = summedValuesByLowercasedLabels[label_toLowerCased] || 0;
                var new_valueSum = existing_valueSum + value;
                summedValuesByLowercasedLabels[label_toLowerCased] = new_valueSum;
                //
                var existing_titleWithMostMatchesAndMatchCount = titleWithMostMatchesAndMatchCountByLowercasedTitle[label_toLowerCased] || {
                        label: '',
                        value: -1
                    };
                if (existing_titleWithMostMatchesAndMatchCount.value < value) {
                    titleWithMostMatchesAndMatchCountByLowercasedTitle[label_toLowerCased] = {label: label, value: value};
                }
            });
            var lowercasedLabels = Object.keys(summedValuesByLowercasedLabels);
            lowercasedLabels.forEach(function (key, i, arr) {
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
                    value: summedValue,
                    label: reconstitutedDisplayableTitle
                });
            });
            done();
        };
        processedRowObjects_mongooseModel.aggregate(aggregationOperators).allowDiskUse(true)/* or we will hit mem limit on some pages*/.exec(doneFn);
    });

    batch.end(function (err) {
        if (err) return callback(err);

        //
        var data =
        {
            env: process.env,
            
            user: req.user,

            arrayTitle: dataSourceDescription.title,
            array_source_key: source_pKey,
            team: team,
            brandColor: dataSourceDescription.brandColor,
            sourceDoc: sourceDoc,
            sourceDocURL: sourceDocURL,
            view_visibility: dataSourceDescription.fe_views ? dataSourceDescription.fe_views : {},
            //
            groupedResults: groupedResults,
            groupBy: groupBy,
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
            colNames_orderedForGroupByDropdown: importedDataPreparation.HumanReadableFEVisibleColumnNamesWithSampleRowObject_orderedForChartGroupByDropdown(sampleDoc, dataSourceDescription),
            colNames_orderedForSortByDropdown: importedDataPreparation.HumanReadableFEVisibleColumnNamesWithSampleRowObject_orderedForSortByDropdown(sampleDoc, dataSourceDescription),
            //
            routePath_base: routePath_base,
            // multiselectable filter fields
            multiselectableFilterFields: dataSourceDescription.fe_filters_fieldsMultiSelectable,
            // Aggregate By
            aggregateBy_humanReadable_available: aggregateBy_humanReadable_available,
            defaultAggregateByColumnName_humanReadable: defaultAggregateByColumnName_humanReadable,
            aggregateBy: aggregateBy
        };
        callback(err, data);
    });
};