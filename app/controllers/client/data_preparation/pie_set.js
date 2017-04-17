var winston = require('winston');
var Batch = require('batch');
var _ = require('lodash');
//
var importedDataPreparation = require('../../../libs/datasources/imported_data_preparation');
var datatypes = require('../../../libs/datasources/datatypes');
var raw_source_documents = require('../../../models/raw_source_documents');
var processed_row_objects = require('../../../models/processed_row_objects');
var config = require('../config');
var func = require('../func');
var _ = require("lodash");
var User = require('../../../models/users');

/**
 *
 */
module.exports.BindData = function (req, urlQuery, callback) {
    var self = this;
    // urlQuery keys:
    // source_key
    // groupBy
    // chartBy
    // searchQ
    // searchCol
    // embed
    // Other filters
    var source_pKey = urlQuery.source_key;
    var collectionPKey = process.env.NODE_ENV !== 'enterprise'? req.subdomains[0] + '-' + source_pKey : source_pKey;

     var askForPreview = false;
    if (urlQuery.preview && urlQuery.preview == 'true') askForPreview = true;

    importedDataPreparation.DataSourceDescriptionWithPKey(askForPreview,collectionPKey)
        .then(function (dataSourceDescription) {
            if (dataSourceDescription == null || typeof dataSourceDescription === 'undefined') {
                callback(new Error("No data source with that source pkey " + source_pKey), null);
                return;
            }

            if (typeof dataSourceDescription.fe_views !== 'undefined' && dataSourceDescription.fe_views.views != null && typeof dataSourceDescription.fe_views.views.pieSet === 'undefined') {
                callback(new Error('View doesn\'t exist for dataset. UID? urlQuery: ' + JSON.stringify(urlQuery, null, '\t')), null);
                return;
            }

            var processedRowObjects_mongooseContext = processed_row_objects.Lazy_Shared_ProcessedRowObject_MongooseContext(dataSourceDescription._id);
            var processedRowObjects_mongooseModel = processedRowObjects_mongooseContext.Model;
            //
            var groupBy = urlQuery.groupBy; // the human readable col name - real col name derived below
            var defaultGroupByColumnName_humanReadable = dataSourceDescription.fe_displayTitleOverrides[dataSourceDescription.fe_views.views.pieSet.defaultGroupByColumnName] ||
            dataSourceDescription.fe_views.views.pieSet.defaultGroupByColumnName;



            var groupBy_realColumnName =  groupBy? importedDataPreparation.RealColumnNameFromHumanReadableColumnName(groupBy,dataSourceDescription) :
            (dataSourceDescription.fe_views.views.pieSet.defaultGroupByColumnName == 'Object Title') ? importedDataPreparation.RealColumnNameFromHumanReadableColumnName(dataSourceDescription.fe_views.views.pieSet.defaultGroupByColumnName,dataSourceDescription) :
             dataSourceDescription.fe_views.views.pieSet.defaultGroupByColumnName



            //
            var chartBy = urlQuery.chartBy; // the human readable col name - real col name derived below
            var defaultChartByColumnName_humanReadable = dataSourceDescription.fe_displayTitleOverrides[dataSourceDescription.fe_views.views.pieSet.defaultChartByColumnName] ||
            dataSourceDescription.fe_views.views.pieSet.defaultChartByColumnName;



            var chartBy_realColumnName =  chartBy? importedDataPreparation.RealColumnNameFromHumanReadableColumnName(chartBy,dataSourceDescription) :
            (dataSourceDescription.fe_views.views.pieSet.defaultChartByColumnName == 'Object Title') ? importedDataPreparation.RealColumnNameFromHumanReadableColumnName(dataSourceDescription.fe_views.views.pieSet.defaultChartByColumnName,dataSourceDescription) :
             dataSourceDescription.fe_views.views.pieSet.defaultChartByColumnName




            //
            var raw_rowObjects_coercionSchema = dataSourceDescription.raw_rowObjects_coercionScheme;
            //
            var routePath_base = "/" + source_pKey + "/pie-set";
            var sourceDocURL = dataSourceDescription.urls && dataSourceDescription.urls.length > 0 ? dataSourceDescription.urls[0] : null;
            if (urlQuery.embed == 'true') routePath_base += '?embed=true';
            if (urlQuery.preview == 'true') routePath_base += '?preview=true';
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
            var defaultAggregateByColumnName_humanReadable = dataSourceDescription.fe_displayTitleOverrides[dataSourceDescription.fe_views.views.pieSet.defaultAggregateByColumnName] ||
                dataSourceDescription.fe_views.views.pieSet.defaultAggregateByColumnName


            var numberOfRecords_notAvailable = dataSourceDescription.fe_views.views.pieSet.aggregateByColumnName_numberOfRecords_notAvailable;
            if (!defaultAggregateByColumnName_humanReadable && !numberOfRecords_notAvailable)
                defaultAggregateByColumnName_humanReadable = config.aggregateByDefaultColumnName;


            var aggregateBy_realColumnName = aggregateBy? importedDataPreparation.RealColumnNameFromHumanReadableColumnName(aggregateBy,dataSourceDescription) :
            (typeof dataSourceDescription.fe_views.views.pieSet.defaultAggregateByColumnName  == 'undefined') ?importedDataPreparation.RealColumnNameFromHumanReadableColumnName(defaultAggregateByColumnName_humanReadable,dataSourceDescription) :
            dataSourceDescription.fe_views.views.pieSet.defaultAggregateByColumnName;


            //
            var sourceDoc, sampleDoc, uniqueFieldValuesByFieldName, groupedResults = [];

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
            })


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
                            {$unwind: "$" + "rowParams." + chartBy_realColumnName},
                            { // unique/grouping and summing stage
                                $group: {
                                    _id: {
                                        groupBy: "$" + "rowParams." + groupBy_realColumnName,
                                        chartBy: "$" + "rowParams." + chartBy_realColumnName
                                    },
                                    value: {
                                        $addToSet: {object: "$_id", totalSum: "$" + "rowParams." + aggregateBy_realColumnName}

                                    } // the count
                                }
                            },
                            { // reformat
                                $project: {
                                    _id: 0,
                                    groupBy: "$_id.groupBy",
                                    chartBy: "$_id.chartBy",
                                    value: {$sum: "$value.totalSum"}
                                }
                            },
                            { // priotize by incidence, since we're $limit-ing below
                                $sort: {value: -1}
                            },
                            /* {
                             $limit: 100 // so the pie-set can actually handle the number
                             } */
                        ]);
                } else {


                    aggregationOperators = aggregationOperators.concat(
                        [
                            {$unwind: "$" + "rowParams." + groupBy_realColumnName},
                            {$unwind: "$" + "rowParams." + chartBy_realColumnName},
                            { // unique/grouping and summing stage
                                $group: {
                                    _id: {
                                        groupBy: "$" + "rowParams." + groupBy_realColumnName,
                                        chartBy: "$" + "rowParams." + chartBy_realColumnName
                                    },
                                    value: {$addToSet: "$_id"} // the count
                                }
                            },
                            { // reformat
                                $project: {
                                    _id: 0,
                                    groupBy: "$_id.groupBy",
                                    chartBy: "$_id.chartBy",
                                    value: {$size: "$value"}
                                }
                            },
                            { // priotize by incidence, since we're $limit-ing below
                                $sort: {value: -1}
                            },
                            /* {
                             $limit: 100 // so the pie-set can actually handle the number
                             } */
                        ]);
                }
                //
                var doneFn = function (err, _groupedResults) {
                    if (err) return done(err);

                    if (_groupedResults == undefined || _groupedResults == null) _groupedResults = [];

                    var finalizedButNotCoalesced_groupedResults = {};
                    _.forEach(_groupedResults, function (el) {
                        // Group By
                        var displayValGroupBy = func.formatCoercedField(groupBy_realColumnName, el.groupBy, dataSourceDescription)
                        var displayableGroupBy = func.ValueToExcludeByOriginalKey(
                            displayValGroupBy, dataSourceDescription, groupBy_realColumnName, 'pieSet');
                        if (!displayableGroupBy) return;

                        // Chart By
                        var displayValChartBy = func.formatCoercedField(chartBy_realColumnName, el.chartBy, dataSourceDescription)
                        var displayableChartBy = func.ValueToExcludeByOriginalKey(
                            displayValChartBy, dataSourceDescription, chartBy_realColumnName, 'pieSet');
                        if (!displayableChartBy) return;

                        if (!finalizedButNotCoalesced_groupedResults[displayableChartBy]) finalizedButNotCoalesced_groupedResults[displayableChartBy] = [];
                        finalizedButNotCoalesced_groupedResults[displayableChartBy].push({
                            value: el.value,
                            label: displayableGroupBy
                        });
                    });

                    _.forOwn(finalizedButNotCoalesced_groupedResults, function (_groupedResultsByChart, chartBy) {

                        var summedValuesByLowercasedLabels = {};
                        var titleWithMostMatchesAndMatchCountByLowercasedTitle = {};
                        _groupedResultsByChart.forEach(function (el, i, arr) {
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
                        var colors = dataSourceDescription.fe_views.views.pieSet.colorsInPercentOrder ? dataSourceDescription.fe_views.views.pieSet.colorsInPercentOrder : {};

                        var data = [];
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
                            var row = {
                                value: summedValue,
                                label: reconstitutedDisplayableTitle,
                                valueToString: datatypes.displayNumberWithComma(summedValue)
                            };
                            if (colors && colors[i]) row.color = colors[i];

                            data.push(row);
                        });

                        groupedResults.push({
                            title: chartBy,
                            data: data
                        });
                    });

                    done();
                };
                processedRowObjects_mongooseModel.aggregate(aggregationOperators).allowDiskUse(true)/* or we will hit mem limit on some pages*/.exec(doneFn);
            });


            var user = null;
            batch.push(function(done) {
                if (req.user) {
                    User.findById(req.user)
                        .populate('defaultLoginTeam')
                        .exec(function(err, doc) {
                            if (err) return done(err);
                            user = doc;
                            done();
                        });
                } else {
                    done();
                }
            });

            var user = null;
            batch.push(function(done) {
                if (req.user) {
                    User.findById(req.user)
                        .populate('defaultLoginTeam')
                        .exec(function(err, doc) {
                            if (err) return done(err);
                            user = doc;
                            done();
                        });
                } else {
                    done();
                }
            });

            batch.end(function (err) {
                if (err) return callback(err);

                var flatResults = groupedResults.reduce(function (groups, dataSet) {
                    dataSet.data.forEach(function (dataPoint) {
                        if (!(dataPoint.label in groups)) {
                            groups[dataPoint.label] = dataPoint;
                        }
                    });

                    return groups;
                }, {});


                flatResults = Object.keys(flatResults).map(function (key) {
                    return flatResults[key];
                });



                var data =
                {
                    env: process.env,

                    user: user,

                    arrayTitle: dataSourceDescription.title,
                    array_source_key: source_pKey,
                    team: dataSourceDescription._team ? dataSourceDescription._team : null,
                    displayTitleOverrides:  _.cloneDeep(dataSourceDescription.fe_displayTitleOverrides),
                    brandColor: dataSourceDescription.brandColor,
                    brandWhiteText: func.useLightBrandText(dataSourceDescription.brandColor),
                    brandContentColor: func.calcContentColor(dataSourceDescription.brandColor),
                    sourceDoc: sourceDoc,
                    sourceDocURL: sourceDocURL,
                    description: dataSourceDescription.description ? dataSourceDescription.description : "",
                    view_visibility: dataSourceDescription.fe_views.views ? dataSourceDescription.fe_views.views : {},
                    view_description: dataSourceDescription.fe_views.views.pieSet.description ? dataSourceDescription.fe_views.views.pieSet.description : "",
                    //
                    groupedResults: groupedResults,
                    flatResults: flatResults,
                    groupBy: groupBy,
                    chartBy: chartBy,
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
                    colNames_orderedForGroupByDropdown: importedDataPreparation.HumanReadableFEVisibleColumnNamesWithSampleRowObject_orderedForDropdown(sampleDoc, dataSourceDescription, 'pieSet', 'GroupBy'),
                    //
                    defaultChartByColumnName_humanReadable: defaultChartByColumnName_humanReadable,
                    colNames_orderedForChartByDropdown: importedDataPreparation.HumanReadableFEVisibleColumnNamesWithSampleRowObject_orderedForDropdown(sampleDoc, dataSourceDescription, 'pieSet', 'ChartBy'),
                    //
                    colNames_orderedForSortByDropdown: importedDataPreparation.HumanReadableFEVisibleColumnNamesWithSampleRowObject_orderedForSortByDropdown(sampleDoc, dataSourceDescription),
                    //
                    routePath_base: routePath_base,
                    // multiselectable filter fields
                    multiselectableFilterFields: dataSourceDescription.fe_filters.fieldsMultiSelectable,
                    // Aggregate By
                    colNames_orderedForAggregateByDropdown: importedDataPreparation.HumanReadableFEVisibleColumnNamesWithSampleRowObject_orderedForDropdown(sampleDoc, dataSourceDescription, 'pieSet', 'AggregateBy', 'ToInteger'),
                    defaultAggregateByColumnName_humanReadable: defaultAggregateByColumnName_humanReadable,
                    aggregateBy: aggregateBy,
                    defaultView: config.formatDefaultView(dataSourceDescription.fe_views.default_view),
                    isPreview: askForPreview
                };
                callback(err, data);
            })

        })
};