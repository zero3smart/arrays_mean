var winston = require('winston');
var queryString = require('querystring');
var _ = require('lodash');
var Batch = require('batch');
//
var importedDataPreparation = require('../../../libs/datasources/imported_data_preparation');
var datatypes = require('../../../libs/datasources/datatypes');
var raw_source_documents = require('../../../models/raw_source_documents');
var processed_row_objects = require('../../../models/processed_row_objects');
var config = require('../config');
var func = require('../func');
var User = require('../../../models/users');

/**
 * Scatterplot view action controller.
 * @param {Object} urlQuery - URL params
 * @param {Function} callback
 */
module.exports.BindData = function (req, urlQuery, callback) {
    var self = this;

    var sourceKey = urlQuery.source_key;
    var collectionPKey = process.env.NODE_ENV !== 'enterprise'? req.subdomains[0] + '-' + sourceKey : sourceKey;
    var askForPreview = false;
    if (urlQuery.preview && urlQuery.preview == 'true') askForPreview = true;

 
    importedDataPreparation.DataSourceDescriptionWithPKey(askForPreview,collectionPKey)
        .then(function (dataSourceDescription) {
            if (dataSourceDescription == null || typeof dataSourceDescription === 'undefined') {
                callback(new Error("No data source with that source pkey " + sourceKey), null);
                return;
            }

            if (typeof dataSourceDescription.fe_views !== 'undefined' && dataSourceDescription.fe_views.views != null && typeof dataSourceDescription.fe_views.views.scatterplot === 'undefined') {
                callback(new Error('View doesn\'t exist for dataset. UID? urlQuery: ' + JSON.stringify(urlQuery, null, '\t')), null);
                return;
            }

            /* Get somewhat mongoose context.
             */
            var processedRowObjects_mongooseContext = processed_row_objects
                .Lazy_Shared_ProcessedRowObject_MongooseContext(dataSourceDescription._id);
            /*
             * Stash somewhat model reference.
             */
            var processedRowObjects_mongooseModel = processedRowObjects_mongooseContext.Model;


            var urlQuery_forSwitchingViews = "";
            var appendQuery = "";

            var routePath_base = '/' + sourceKey + '/scatterplot';
            if (urlQuery.embed == 'true') routePath_base += '?embed=true';
            if (urlQuery.preview == 'true') routePath_base += '?preview=true';
            /*
             * Check filter active and update composed URL params.
             */
            var truesByFilterValueByFilterColumnName_forWhichNotToOutputColumnNameInPill = func.new_truesByFilterValueByFilterColumnName_forWhichNotToOutputColumnNameInPill(dataSourceDescription);
            var filterObj = func.filterObjFromQueryParams(urlQuery);
            var isFilterActive = Object.keys(filterObj).length != 0;
            if (isFilterActive) {
                appendQuery = queryString.stringify(filterObj);
                urlQuery_forSwitchingViews = func.urlQueryByAppendingQueryStringToExistingQueryString(urlQuery_forSwitchingViews, appendQuery);
            }

            /*
             * Search column and query for header_bar_array/constructed  * route path
             */
            var searchCol = urlQuery.searchCol;
            var searchQ = urlQuery.searchQ;
            var isSearchActive = typeof searchCol !== 'undefined' && searchCol != null && searchCol != ""
                && typeof searchQ !== 'undefined' && searchQ != null && searchQ != "";
            /*
             * Check search active and update composed URL params.
             */
            if (isSearchActive) {
                appendQuery = "searchCol=" + urlQuery.searchCol + "&" + "searchQ=" + urlQuery.searchQ;
                urlQuery_forSwitchingViews = func.urlQueryByAppendingQueryStringToExistingQueryString(urlQuery_forSwitchingViews, appendQuery);
            }
            /*
             * Aggregate for radius size
             */
            var aggregateBy = urlQuery.aggregateBy;
            var aggregateBy_humanReadable = dataSourceDescription.fe_displayTitleOverrides[dataSourceDescription.fe_views.views.scatterplot.defaultAggregateByColumnName] || dataSourceDescription.fe_views.views.scatterplot.defaultAggregateByColumnName;
            var aggregateBy_realColumnName = aggregateBy ? importedDataPreparation.RealColumnNameFromHumanReadableColumnName(aggregateBy, dataSourceDescription) : (typeof dataSourceDescription.fe_views.views.scatterplot.defaultAggregateByColumnName == 'undefined') ? importedDataPreparation.RealColumnNameFromHumanReadableColumnName(aggregateBy_humanReadable, dataSourceDescription) : dataSourceDescription.fe_views.views.scatterplot.defaultAggregateByColumnName;

            // yAxis
            var yAxis = urlQuery.yAxis;
            var yAxis_humanReadable = dataSourceDescription.fe_displayTitleOverrides[yAxis] || dataSourceDescription.fe_views.views.scatterplot.defaults.yAxisField;
            var yAxis_realName = yAxis ? importedDataPreparation.RealColumnNameFromHumanReadableColumnName(yAxis, dataSourceDescription) : (typeof dataSourceDescription.fe_views.views.scatterplot.defaults.yAxisField == 'undefined') ? importedDataPreparation.RealColumnNameFromHumanReadableColumnName(yAxis_humanReadable, dataSourceDescription) : dataSourceDescription.fe_views.views.scatterplot.defaults.yAxisField;

            // xAxis
            var xAxis = urlQuery.xAxis;
            var xAxis_humanReadable = dataSourceDescription.fe_displayTitleOverrides[xAxis] || dataSourceDescription.fe_views.views.scatterplot.defaults.xAxisField;
            var xAxis_realName = xAxis ? importedDataPreparation.RealColumnNameFromHumanReadableColumnName(xAxis, dataSourceDescription) : (typeof dataSourceDescription.fe_views.views.scatterplot.defaults.xAxisField == 'undefined') ? importedDataPreparation.RealColumnNameFromHumanReadableColumnName(xAxis_humanReadable, dataSourceDescription) : dataSourceDescription.fe_views.views.scatterplot.defaults.xAxisField;

            var objectTitle = dataSourceDescription.objectTitle;

            var documents;
            var numericFields;

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

            // Obtain top unique field values for filtering
            batch.push(function (done) {
                func.topUniqueFieldValuesForFiltering(dataSourceDescription, function (err, _uniqueFieldValuesByFieldName) {
                    if (err) return done(err);

                    uniqueFieldValuesByFieldName = _uniqueFieldValuesByFieldName;
                    done();
                });
            });

            // Obtain grouped results
            batch.push(function (done) {
                var aggregateValue;

                var doneFn = function(err, groupedDocuments) {
                    if (err) return done(err);
                    if (!groupedDocuments[0].rowParams) {
                        documents = [];
                        var imageField = dataSourceDescription.fe_image.field;
                        groupedDocuments.forEach(function (el, i, arr) {
                            documents.push({
                                _id: el.id,
                                rowParams: {}
                            })
                            documents[i].rowParams[xAxis_realName] = el.xAxis;
                            documents[i].rowParams[yAxis_realName] = el.yAxis;
                            documents[i].rowParams[imageField] = el.image,
                            documents[i].rowParams[aggregateBy_realColumnName] = el.aggregateBy
                            documents[i].rowParams[objectTitle] = el.objectTitle
                        })
                    } else {
                        documents = groupedDocuments;
                    }
                    var sampleDoc = documents[0];
                    done();
                };

                var aggregationOperators = [];
                if (isSearchActive) {
                    var _orErrDesc = func.activeSearch_matchOp_orErrDescription(dataSourceDescription, searchCol, searchQ);
                    if (_orErrDesc.err) _orErrDesc.matchOps = [];
                }
                if (isFilterActive) { // rules out undefined filterCol
                    var _orErrDesc = func.activeFilter_matchOp_orErrDescription_fromMultiFilter(dataSourceDescription, filterObj);
                    if (_orErrDesc.err) _orErrDesc.matchOps = [];

                    aggregationOperators = aggregationOperators.concat(_orErrDesc.matchOps);
                }
                if (aggregateBy_realColumnName == config.aggregateByDefaultColumnName) {
                    aggregationOperators = aggByNumberOfItems(aggregationOperators, dataSourceDescription.fe_image.field);
                }
                if (aggregationOperators.length > 0) {
                    processedRowObjects_mongooseModel.aggregate(aggregationOperators).allowDiskUse(true).exec(doneFn)
                } else {
                    processedRowObjects_mongooseModel.find({}).exec(doneFn);
                }
            });

            var aggByNumberOfItems = function (aggregationOperators, image) {
                var unwind = [
                    {$unwind: "$" + "rowParams." + xAxis_realName},
                    {$unwind: "$" + "rowParams." + yAxis_realName}
                ]
                var group = [{
                    $group: {
                        _id: {
                            xAxis: "$" + "rowParams." + xAxis_realName,
                            yAxis: "$" + "rowParams." + yAxis_realName,
                        },
                        value: {$addToSet: "$_id"},
                        title: {$addToSet: "$rowParams." + objectTitle},
                    }
                }]
                var project = [{
                    $project: {
                        _id: 0,
                        id: "$value",
                        objectTitle: "$title",
                        xAxis: "$_id.xAxis",
                        yAxis: "$_id.yAxis",
                        aggregateBy: {$size: "$value"},
                    }
                }]
                var sort = {
                    $sort: {aggregateBy: 1}
                }

                if (image) {
                    group[0]["$group"].image = {$addToSet: "$rowParams." + image};
                    project[0]["$project"].image = "$image";
                }
                var fullAggregateQuery = unwind.concat(group, project, sort)
                aggregationOperators = aggregationOperators.concat(fullAggregateQuery);
                return aggregationOperators;
            }

            var hasGalleryView = function() {
                if (dataSourceDescription.fe_views.views.gallery) {
                    if (dataSourceDescription.fe_views.views.gallery.visible == true) {
                        return true;
                    }
                }
                return false;
            }
            
            var user = null;
            batch.push(function (done) {
                if (req.user) {
                    User.findById(req.user, function (err, doc) {
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
                var data = {
                    env: process.env,

                    user: user,

                    displayTitleOverrides:  _.cloneDeep(dataSourceDescription.fe_displayTitleOverrides),

                    documents: documents,
                    metaData: dataSourceDescription,
                    // renderableFields: numericFields,
                    array_source_key: sourceKey,
                    team: dataSourceDescription._team ? dataSourceDescription._team : null,
                    brandColor: dataSourceDescription.brandColor,
                    brandContentColor: func.calcContentColor(dataSourceDescription.brandColor),
                    uniqueFieldValuesByFieldName: uniqueFieldValuesByFieldName,
                    sourceDoc: sourceDoc,
                    view_visibility: dataSourceDescription.fe_views.views ? dataSourceDescription.fe_views.views : {},
                    view_description: dataSourceDescription.fe_views.views.scatterplot.description ? dataSourceDescription.fe_views.views.scatterplot.description : "",
                    //
                    routePath_base: routePath_base,
                    filterObj: filterObj,
                    isFilterActive: isFilterActive,
                    urlQuery_forSwitchingViews: urlQuery_forSwitchingViews,
                    searchCol: searchCol,
                    searchQ: searchQ,
                    colNames_orderedForSortByDropdown: importedDataPreparation.HumanReadableFEVisibleColumnNamesWithSampleRowObject_orderedForSortByDropdown(sampleDoc, dataSourceDescription),
                    // multiselectable filter fields,
                    aggregateBy: aggregateBy,
                    colNames_orderedForAggregateByDropdown: importedDataPreparation.HumanReadableFEVisibleColumnNamesWithSampleRowObject_orderedForDropdown(sampleDoc, dataSourceDescription, 'scatterplot', 'AggregateBy', 'ToInteger'),
                    multiselectableFilterFields: dataSourceDescription.fe_filters.fieldsMultiSelectable,
                    aggregateBy_realColumnName: aggregateBy_realColumnName,
                    aggregateBy_humanReadable: aggregateBy_humanReadable,
                    xAxis: xAxis,
                    yAxis: yAxis,
                    xAxis_humanReadable: xAxis_humanReadable,
                    yAxis_humanReadable: yAxis_humanReadable,
                    colNames_orderedForXAxisDropdown: importedDataPreparation.HumanReadableFEVisibleColumnNamesWithSampleRowObject_orderedForDropdown(sampleDoc, dataSourceDescription, 'scatterplot', 'defaults.xAxisField', 'ToInteger'),
                    colNames_orderedForYAxisDropdown: importedDataPreparation.HumanReadableFEVisibleColumnNamesWithSampleRowObject_orderedForDropdown(sampleDoc, dataSourceDescription, 'scatterplot', 'defaults.yAxisField', 'ToInteger'),
                    defaultView: config.formatDefaultView(dataSourceDescription.fe_views.default_view),
                    hasGalleryView: hasGalleryView,
                    isPreview: askForPreview

                };
                callback(err, data);
            })

    })
}



