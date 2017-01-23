var winston = require('winston');
var Batch = require('batch');
var express = require('express');
var _ = require('lodash');
//
var importedDataPreparation = require('../../../libs/datasources/imported_data_preparation');
var datatypes = require('../../../libs/datasources/datatypes');
var raw_source_documents = require('../../../models/raw_source_documents');
var processed_row_objects = require('../../../models/processed_row_objects');
var config = require('../config');
var func = require('../func');
var User = require('../../../models/users');

/**
 * @param {Object} urlQuery - URL params
 * @param {Function} callback
 */
module.exports.BindData = function (req, urlQuery, callback) {
    var self = this;
    // urlQuery keys:
    // source_key
    // aggregateBy
    // groupBy
    // stackBy
    // searchQ
    // searchCol
    // embed
    // filters
    var source_pKey = urlQuery.source_key;
    var collectionPKey = req.subdomains[0] + '-' + source_pKey;

    importedDataPreparation.DataSourceDescriptionWithPKey(collectionPKey)
        .then(function (dataSourceDescription) {

            if (dataSourceDescription == null || typeof dataSourceDescription === 'undefined') {
                callback(new Error("No data source with that source pkey " + source_pKey), null);

                return;
            }

            if (typeof dataSourceDescription.fe_views !== 'undefined' && dataSourceDescription.fe_views.views != null && typeof dataSourceDescription.fe_views.views.barChart === 'undefined') {
                callback(new Error('View doesn\'t exist for dataset. UID? urlQuery: ' + JSON.stringify(urlQuery, null, '\t')), null);
                return;
            }

            var processedRowObjects_mongooseContext = processed_row_objects.Lazy_Shared_ProcessedRowObject_MongooseContext(dataSourceDescription._id);
            var processedRowObjects_mongooseModel = processedRowObjects_mongooseContext.Model;
            //
            var groupBy = urlQuery.groupBy; // the human readable col name - real col name derived below
            var defaultGroupByColumnName_humanReadable = dataSourceDescription.fe_displayTitleOverrides[dataSourceDescription.fe_views.views.barChart.defaultGroupByColumnName] || dataSourceDescription.fe_views.views.barChart.defaultGroupByColumnName;



            var groupBy_realColumnName =  groupBy? importedDataPreparation.RealColumnNameFromHumanReadableColumnName(groupBy,dataSourceDescription) :
            (dataSourceDescription.fe_views.views.barChart.defaultGroupByColumnName == 'Object Title') ? importedDataPreparation.RealColumnNameFromHumanReadableColumnName(dataSourceDescription.fe_views.views.barChart.defaultGroupByColumnName,dataSourceDescription) :
             dataSourceDescription.fe_views.views.barChart.defaultGroupByColumnName;




            var raw_rowObjects_coercionSchema = dataSourceDescription.raw_rowObjects_coercionScheme;
            var groupBy_isDate = (raw_rowObjects_coercionSchema && raw_rowObjects_coercionSchema[groupBy_realColumnName] &&
            raw_rowObjects_coercionSchema[groupBy_realColumnName].operation == "ToDate");
            var groupBy_outputInFormat = '';

            var findOutputFormatObj = func.findItemInArrayOfObject(dataSourceDescription.fe_views.views.barChart.outputInFormat,groupBy_realColumnName);


            if (findOutputFormatObj != null) {
                groupBy_outputInFormat = findOutputFormatObj.value;
            } else if (dataSourceDescription.raw_rowObjects_coercionScheme && dataSourceDescription.raw_rowObjects_coercionScheme[groupBy_realColumnName] &&
                dataSourceDescription.raw_rowObjects_coercionScheme[groupBy_realColumnName].outputFormat) {
                groupBy_outputInFormat = dataSourceDescription.raw_rowObjects_coercionScheme[groupBy_realColumnName].outputFormat;
            }
            //
            var stackBy = urlQuery.stackBy; // the human readable col name - real col name derived below
            var defaultStackByColumnName_humanReadable = dataSourceDescription.fe_displayTitleOverrides[dataSourceDescription.fe_views.views.barChart.defaultStackByColumnName] || dataSourceDescription.fe_views.views.barChart.defaultStackByColumnName;


            var stackBy_realColumnName =  stackBy ? importedDataPreparation.RealColumnNameFromHumanReadableColumnName(stackBy,dataSourceDescription) :
            (dataSourceDescription.fe_views.views.barChart.defaultStackByColumnName == 'Object Title') ? importedDataPreparation.RealColumnNameFromHumanReadableColumnName(dataSourceDescription.fe_views.views.barChart.defaultStackByColumnName,dataSourceDescription) :
            dataSourceDescription.fe_views.views.barChart.defaultStackByColumnName;




            var routePath_base = "/" + source_pKey + "/bar-chart";
            var sourceDocURL = dataSourceDescription.urls ? dataSourceDescription.urls.length > 0 ? dataSourceDescription.urls[0] : null : null;
            if (urlQuery.embed == 'true') routePath_base += '?embed=true';
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
            var defaultAggregateByColumnName_humanReadable = dataSourceDescription.fe_displayTitleOverrides[dataSourceDescription.fe_views.views.barChart.defaultAggregateByColumnName] || dataSourceDescription.fe_views.views.barChart.defaultAggregateByColumnName;

            var numberOfRecords_notAvailable = dataSourceDescription.fe_views.views.barChart_aggregateByColumnName_numberOfRecords_notAvailable;
            if (!defaultAggregateByColumnName_humanReadable && !numberOfRecords_notAvailable)
                defaultAggregateByColumnName_humanReadable = config.aggregateByDefaultColumnName;

            // Aggregate By Available
            var colNames_orderedForAggregateByDropdown = undefined;
            for (var colName in raw_rowObjects_coercionSchema) {
                var colValue = raw_rowObjects_coercionSchema[colName];
                if (colValue.operation == "ToInteger") {

                    var isExcluded = dataSourceDescription.fe_excludeFields && dataSourceDescription.fe_excludeFields[colName];
                    if (!isExcluded) {
                        var humanReadableColumnName = colName;
                        if (dataSourceDescription.fe_displayTitleOverrides && dataSourceDescription.fe_displayTitleOverrides[colName])
                            humanReadableColumnName = dataSourceDescription.fe_displayTitleOverrides[colName];

                        if (!colNames_orderedForAggregateByDropdown) {
                            colNames_orderedForAggregateByDropdown = [];
                            if (!numberOfRecords_notAvailable)
                                colNames_orderedForAggregateByDropdown.push(config.aggregateByDefaultColumnName); // Add the default - aggregate by number of records.
                        }

                        colNames_orderedForAggregateByDropdown.push(humanReadableColumnName);
                    }

                }
            }

            if (colNames_orderedForAggregateByDropdown) {
                if (colNames_orderedForAggregateByDropdown.length == 1)
                    colNames_orderedForAggregateByDropdown = undefined;
            }

            var aggregateBy_realColumnName = aggregateBy? importedDataPreparation.RealColumnNameFromHumanReadableColumnName(aggregateBy,dataSourceDescription) :
            (typeof dataSourceDescription.fe_views.views.barChart.defaultAggregateByColumnName  == 'undefined') ?importedDataPreparation.RealColumnNameFromHumanReadableColumnName(defaultAggregateByColumnName_humanReadable,dataSourceDescription) :
            dataSourceDescription.fe_views.views.barChart.defaultAggregateByColumnName;


            //
            var sourceDoc, sampleDoc, uniqueFieldValuesByFieldName, stackedResultsByGroup = {};

            ///
            // graphData is exported and used by template for bar chart generation
            var graphData;

            var batch = new Batch();
            batch.concurrency(1);


            // Obtain source document
            batch.push(function (done) {
                raw_source_documents.Model.findOne({primaryKey: dataSourceDescription._id}, function (err, _sourceDoc) {
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
                func.topUniqueFieldValuesForFiltering(dataSourceDescription, function (err, _uniqueFieldValuesByFieldName) {
                    if (err) return done(err);

                    uniqueFieldValuesByFieldName = _uniqueFieldValuesByFieldName;
                    done();
                });
            });

            // Obtain Grouped ResultSet
            batch.push(function (done) {
                //
                var aggregationOperators = [];
                if (isSearchActive) {
                    var _orErrDesc = func.activeSearch_matchOp_orErrDescription(dataSourceDescription, searchCol, searchQ);
                    if (_orErrDesc.err) return done(_orErrDesc.err);

                    aggregationOperators = aggregationOperators.concat(_orErrDesc.matchOps);
                }
                if (isFilterActive) { // rules out undefined filterCol
                    var _orErrDesc = func.activeFilter_matchOp_orErrDescription_fromMultiFilter(dataSourceDescription, filterObj);
                    if (_orErrDesc.err) return done(_orErrDesc.err);

                    aggregationOperators = aggregationOperators.concat(_orErrDesc.matchOps);
                }


                if (typeof aggregateBy_realColumnName !== 'undefined' && aggregateBy_realColumnName !== null && aggregateBy_realColumnName !== "" && aggregateBy_realColumnName != config.aggregateByDefaultColumnName) {

                    if (typeof stackBy_realColumnName !== 'undefined' && stackBy_realColumnName !== null && stackBy_realColumnName !== "") {

                        aggregationOperators = aggregationOperators.concat(
                            [
                                {$unwind: "$" + "rowParams." + groupBy_realColumnName},
                                {$unwind: "$" + "rowParams." + stackBy_realColumnName},
                                {
                                    $group: {
                                        _id: {
                                            groupBy: "$" + "rowParams." + groupBy_realColumnName,
                                            stackBy: "$" + "rowParams." + stackBy_realColumnName
                                        },
                                        value: {$sum: "$" + "rowParams." + aggregateBy_realColumnName}
                                    }
                                },
                                {
                                    $project: {
                                        _id: 0,
                                        category: "$_id.groupBy",
                                        label: "$_id.stackBy",
                                        value: 1
                                    }
                                },
                                //{
                                //    $sort: {value: 1} // priotize by incidence
                                //}
                            ]);

                    } else {

                        // Count by summing numeric field in group if option in datasource description is set
                        aggregationOperators = aggregationOperators.concat(
                            [
                                {$unwind: "$" + "rowParams." + groupBy_realColumnName}, // requires MongoDB 3.2, otherwise throws an error if non-array
                                {
                                    $group: {
                                        _id: "$" + "rowParams." + groupBy_realColumnName,
                                        value: {$sum: "$" + "rowParams." + aggregateBy_realColumnName}
                                    }
                                },
                                {
                                    $project: {
                                        _id: 0,
                                        category: "$_id",
                                        value: 1
                                    }
                                },
                                //{
                                //    $sort: {value: 1} // priotize by incidence, since we're $limit-ing below
                                //
                                //}

                            ]);

                    }
                } else {
                    // Count by number of records

                    if (typeof stackBy_realColumnName !== 'undefined' && stackBy_realColumnName !== null && stackBy_realColumnName !== "") {

                        aggregationOperators = aggregationOperators.concat(
                            [
                                {$unwind: "$" + "rowParams." + groupBy_realColumnName},
                                {$unwind: "$" + "rowParams." + stackBy_realColumnName},
                                {
                                    $group: {
                                        _id: {
                                            groupBy: "$" + "rowParams." + groupBy_realColumnName,
                                            stackBy: "$" + "rowParams." + stackBy_realColumnName
                                        },
                                        value: {$sum: 1}
                                    }
                                },
                                {
                                    $project: {
                                        _id: 0,
                                        category: "$_id.groupBy",
                                        label: "$_id.stackBy",
                                        value: 1
                                    }
                                },
                                {
                                    $sort: {value: 1} // priotize by incidence, since we're $limit-ing below
                                }

                            ]);

                    } else {

                        aggregationOperators = aggregationOperators.concat(
                            [
                                {$unwind: "$" + "rowParams." + groupBy_realColumnName}, // requires MongoDB 3.2, otherwise throws an error if non-array
                                { // unique/grouping and summing stage
                                    $group: {
                                        _id: "$" + "rowParams." + groupBy_realColumnName,
                                        value: {$sum: 1}
                                    }
                                },
                                { // reformat
                                    $project: {
                                        _id: 0,
                                        category: "$_id",
                                        value: 1
                                    }
                                },
                                { // priotize by incidence, since we're $limit-ing below
                                    $sort: {value: 1}
                                }
                            ]);
                    }

                }

                var doneFn = function (err, _multigroupedResults) {
                    if (err) return done(err);

                    if (_multigroupedResults == undefined || _multigroupedResults == null) _multigroupedResults = [];


                    var _multigroupedResults_object = {};

                    _.each(_multigroupedResults, function (el) {
                        var category = el.category;
                        if (_multigroupedResults_object[category] === undefined) {
                            _multigroupedResults_object[category] = [];
                        }


                        _multigroupedResults_object[category].push(el);
                    });

                    _.forOwn(_multigroupedResults_object, function (_groupedResults, category) {

                        var displayableCategory;
                        if (groupBy_isDate) {
                            displayableCategory = func.convertDateToBeRecognizable(category, groupBy_realColumnName, dataSourceDescription);
                        } else {
                            displayableCategory = func.ValueToExcludeByOriginalKey(
                                category, dataSourceDescription, groupBy_realColumnName, 'barChart');

                            if (!displayableCategory) return;
                        }

                        var finalizedButNotCoalesced_groupedResults = [];

                        _.each(_groupedResults, function (el, i) {
                            //
                            if (el.label) {
                                var displayableLabel;

                                displayableLabel = func.ValueToExcludeByOriginalKey(
                                    el.label, dataSourceDescription, groupBy_realColumnName, 'barChart');
                                if (!displayableLabel) return;

                                finalizedButNotCoalesced_groupedResults.push({
                                    value: el.value,
                                    label: displayableLabel
                                });
                            } else {
                                finalizedButNotCoalesced_groupedResults.push({
                                    value: el.value,
                                    label: 'default'
                                });
                            }
                        });

                        var summedValuesByLowercasedLabels = {};
                        var titleWithMostMatchesAndMatchAggregateByLowercasedTitle = {};
                        _.each(finalizedButNotCoalesced_groupedResults, function (el) {
                            var label = el.label;
                            var value = el.value;
                            var label_toLowerCased = label.toString().toLowerCase();
                            //
                            var existing_valueSum = summedValuesByLowercasedLabels[label_toLowerCased] || 0;
                            var new_valueSum = existing_valueSum + value;
                            summedValuesByLowercasedLabels[label_toLowerCased] = new_valueSum;
                            //
                            var existing_titleWithMostMatchesAndMatchCount = titleWithMostMatchesAndMatchAggregateByLowercasedTitle[label_toLowerCased] || {
                                    label: '',
                                    value: -1
                                };
                            if (existing_titleWithMostMatchesAndMatchCount.value < value) {
                                var new_titleWithMostMatchesAndMatchCount = {label: label, value: value};
                                titleWithMostMatchesAndMatchAggregateByLowercasedTitle[label_toLowerCased] = new_titleWithMostMatchesAndMatchCount;
                            }
                        });
                        var lowercasedLabels = Object.keys(summedValuesByLowercasedLabels);
                        var groupedResults = [];

                        _.each(lowercasedLabels, function (key, i, arr) {
                            var summedValue = summedValuesByLowercasedLabels[key];
                            var reconstitutedDisplayableTitle = key;
                            var titleWithMostMatchesAndMatchCount = titleWithMostMatchesAndMatchAggregateByLowercasedTitle[key];
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

                        stackedResultsByGroup[displayableCategory] = groupedResults;

                    });

                    var barColors = dataSourceDescription.fe_views.views.barChart.stackedBarColors ? dataSourceDescription.fe_views.views.barChart.stackedBarColors : [];

                    graphData = {categories: [], data: [], colors: barColors};
                    var i = 0;
                    for (var category in stackedResultsByGroup) {
                        if (stackedResultsByGroup.hasOwnProperty(category)) {
                            if (groupBy_isDate) {
                                var offsetTime = new Date(category);
                                offsetTime = new Date(offsetTime.getTime() + offsetTime.getTimezoneOffset() * 60 * 1000);
                                graphData.categories.push(offsetTime);
                            } else {
                                graphData.categories.push(category);
                            }

                            graphData.data.push(stackedResultsByGroup[category]);
                        }
                    }

                    done();
                };

                processedRowObjects_mongooseModel.aggregate(aggregationOperators).allowDiskUse(true)/* or we will hit mem limit on some pages*/.exec(doneFn);
            });

            var user = null;
            batch.push(function(done) {
                if (req.user) {
                    User.findById(req.user, function(err, doc) {
                        if (err) return done(err);
                        user = doc;
                        done();
                    })
                } else {
                    done();
                }
            });

            batch.end(function (err) {
                if (err) return callback(err);


                //
                var data =
                {
                    env: process.env,

                    user: user,

                    arrayTitle: dataSourceDescription.title,
                    array_source_key: source_pKey,
                    team: dataSourceDescription._team ? dataSourceDescription._team : null,
                    brandColor: dataSourceDescription.brandColor,
                    displayTitleOverrides: dataSourceDescription.fe_displayTitleOverrides,
                    sourceDoc: sourceDoc,
                    sourceDocURL: sourceDocURL,
                    view_visibility: dataSourceDescription.fe_views.views ? dataSourceDescription.fe_views.views : {},
                    view_description: dataSourceDescription.fe_views.views.barChart.description ? dataSourceDescription.fe_views.views.barChart.description : "",
                    // Group By
                    groupBy: groupBy,
                    defaultGroupByColumnName_humanReadable: defaultGroupByColumnName_humanReadable,
                    colNames_orderedForGroupByDropdown: importedDataPreparation.HumanReadableFEVisibleColumnNamesWithSampleRowObject_orderedForDropdown(sampleDoc, dataSourceDescription, 'barChart', 'GroupBy'),
                    groupBy_isDate: groupBy_isDate,
                    groupBy_outputInFormat: groupBy_outputInFormat,
                    // Aggregate By
                    colNames_orderedForAggregateByDropdown: colNames_orderedForAggregateByDropdown,
                    defaultAggregateByColumnName_humanReadable: defaultAggregateByColumnName_humanReadable,
                    aggregateBy: aggregateBy,
                    // Stack By
                    stackBy: stackBy,
                    defaultStackByColumnName_humanReadable: defaultStackByColumnName_humanReadable,
                    colNames_orderedForStackByDropdown: importedDataPreparation.HumanReadableFEVisibleColumnNamesWithSampleRowObject_orderedForDropdown(sampleDoc, dataSourceDescription, 'barChart', 'StackBy'),
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
                    colNames_orderedForSortByDropdown: importedDataPreparation.HumanReadableFEVisibleColumnNamesWithSampleRowObject_orderedForSortByDropdown(sampleDoc, dataSourceDescription),
                    //
                    routePath_base: routePath_base,
                    // multiselectable filter fields
                    multiselectableFilterFields: dataSourceDescription.fe_filters.fieldsMultiSelectable,
                    // graphData contains all the data rows; used by the template to create the barchart
                    graphData: graphData,
                    padding: dataSourceDescription.fe_views.views.barChart.padding
                };

                callback(err, data);
            });
        })
        .catch(function (err) {
            //error handling

            winston.error("❌  cannot bind Data to the view, error: ", err);
        });

};
