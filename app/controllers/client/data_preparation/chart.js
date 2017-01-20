var winston = require('winston');
var Batch = require('batch');
var _ = require('lodash');

var importedDataPreparation = require('../../../libs/datasources/imported_data_preparation');
var datatypes = require('../../../libs/datasources/datatypes');
var raw_source_documents = require('../../../models/raw_source_documents');
var processed_row_objects = require('../../../models/processed_row_objects');
var config = require('../config');
var func = require('../func');
var User = require('../../../models/users');

module.exports.BindData = function (req, urlQuery, callback) {
    var self = this;
    // urlQuery keys:
    // source_key
    // groupBy
    // searchQ
    // searchCol
    // embed
    // Other filters
    var source_pKey = urlQuery.source_key;

    importedDataPreparation.DataSourceDescriptionWithPKey(source_pKey)
        .then(function (dataSourceDescription) {
            if (dataSourceDescription == null || typeof dataSourceDescription === 'undefined') {
                callback(new Error("No data source with that source pkey " + source_pKey), null);
                return;
            }

            if (typeof dataSourceDescription.fe_views !== 'undefined' && dataSourceDescription.fe_views.views.chart != null && typeof dataSourceDescription.fe_views.views.chart === 'undefined') {
                callback(new Error('View doesn\'t exist for dataset. UID? urlQuery: ' + JSON.stringify(urlQuery, null, '\t')), null);
                return;
            }

            var chartViewSettings = dataSourceDescription.fe_views.views.chart;
            var processedRowObjects_mongooseContext = processed_row_objects.Lazy_Shared_ProcessedRowObject_MongooseContext(source_pKey);
            var processedRowObjects_mongooseModel = processedRowObjects_mongooseContext.Model;
            //
            var groupBy = urlQuery.groupBy; // the human readable col name - real col name derived below


            var defaultGroupByColumnName_humanReadable = 
            dataSourceDescription.fe_displayTitleOverrides[chartViewSettings.defaultGroupByColumnName] || 
            chartViewSettings.defaultGroupByColumnName;



            var groupBy_realColumnName =  groupBy? importedDataPreparation.RealColumnNameFromHumanReadableColumnName(groupBy,dataSourceDescription) : 
            (chartViewSettings.defaultGroupByColumnName == 'Object Title') ? importedDataPreparation.RealColumnNameFromHumanReadableColumnName(chartViewSettings.defaultGroupByColumnName,dataSourceDescription) :
             chartViewSettings.defaultGroupByColumnName;



            var raw_rowObjects_coercionSchema = dataSourceDescription.raw_rowObjects_coercionScheme;
            //
            var routePath_base = "/" + source_pKey + "/chart";
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
            var defaultAggregateByColumnName_humanReadable = dataSourceDescription.fe_displayTitleOverrides[chartViewSettings.defaultAggregateByColumnName] ||
            chartViewSettings.defaultAggregateByColumnName ;

            var numberOfRecords_notAvailable = chartViewSettings.aggregateByColumnName_numberOfRecords_notAvailable

            if (!defaultAggregateByColumnName_humanReadable && !numberOfRecords_notAvailable)
                defaultAggregateByColumnName_humanReadable = config.aggregateByDefaultColumnName;

            // Aggregate By Available
            var aggregateBy_humanReadable_available = undefined;


            for (var colName in raw_rowObjects_coercionSchema) {
                var colValue = raw_rowObjects_coercionSchema[colName];
                if (colValue.operation == "ToInteger") {


                    var isExcluded = dataSourceDescription.fe_excludeFields && dataSourceDescription.fe_excludeFields[colName];
                    if (!isExcluded) {
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
            }

            if (aggregateBy_humanReadable_available) {
                if (aggregateBy_humanReadable_available.length == 1)
                    aggregateBy_humanReadable_available = undefined;
            }

            var aggregateBy_realColumnName = aggregateBy? importedDataPreparation.RealColumnNameFromHumanReadableColumnName(aggregateBy,dataSourceDescription) :
            (typeof chartViewSettings.defaultAggregateByColumnName  == 'undefined') ?importedDataPreparation.RealColumnNameFromHumanReadableColumnName(defaultAggregateByColumnName_humanReadable,dataSourceDescription) :
            chartViewSettings.defaultAggregateByColumnName;
            
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

                    uniqueFieldValuesByFieldName = _uniqueFieldValuesByFieldName;
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
                            },
                            {
                                $limit: 100 // so the chart can actually handle the number
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
                            },
                            {
                                $limit: 100 // so the chart can actually handle the number
                            }
                        ]);
                }

                //
                var doneFn = function (err, _groupedResults) {
                    if (err) return done(err);

                    if (_groupedResults == undefined || _groupedResults == null) _groupedResults = [];

                    var finalizedButNotCoalesced_groupedResults = [];
                    _groupedResults.forEach(function (el, i, arr) {
                        var displayableVal = func.ValueToExcludeByOriginalKey(
                            el.label, dataSourceDescription, groupBy_realColumnName, 'chart');
                        if (!displayableVal) return;

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

                       


                        var label_toLowerCased = label.toString().toLowerCase();
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
                            titleWithMostMatchesAndMatchCountByLowercasedTitle[label_toLowerCased] = {
                                label: label,
                                value: value
                            };
                        }
                    });

                    // Custom colors
                    var colors = dataSourceDescription.fe_views.views.chart.colorsInPercentOrder ? dataSourceDescription.fe_views.views.chart.colorsInPercentOrder : {};




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
                       
                        var result = {
                            value: summedValue,
                            label: reconstitutedDisplayableTitle,
                            valueToString: datatypes.displayNumberWithComma(summedValue)
                        };
                        if (colors && colors[i]) result.color = colors[i];

                        groupedResults.push(result);
                    });





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
                    view_description: dataSourceDescription.fe_views.views.chart.description ? dataSourceDescription.fe_views.views.chart.description : "",
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
                    colNames_orderedForGroupByDropdown: importedDataPreparation.HumanReadableFEVisibleColumnNamesWithSampleRowObject_orderedForDropdown(sampleDoc, dataSourceDescription, 'chart', 'GroupBy'),
                    colNames_orderedForSortByDropdown: importedDataPreparation.HumanReadableFEVisibleColumnNamesWithSampleRowObject_orderedForSortByDropdown(sampleDoc, dataSourceDescription),
                    //
                    routePath_base: routePath_base,
                    // multiselectable filter fields
                    multiselectableFilterFields: dataSourceDescription.fe_filters.fieldsMultiSelectable,
                    // Aggregate By
                    aggregateBy_humanReadable_available: aggregateBy_humanReadable_available,
                    defaultAggregateByColumnName_humanReadable: defaultAggregateByColumnName_humanReadable,
                    aggregateBy: aggregateBy
                };
                callback(err, data);
            });

        })

};