var winston = require('winston');
var moment = require('moment');
var Batch = require('batch');
var _ = require('lodash');
//
var importedDataPreparation = require('../../../libs/datasources/imported_data_preparation');
var datatypes = require('../../../libs/datasources/datatypes');
var raw_source_documents = require('../../../models/raw_source_documents');
var processed_row_objects = require('../../../models/processed_row_objects');
var config = require('../config');
var func = require('../func');
var User = require('../../../models/users');
//
module.exports.BindData = function(req, urlQuery, callback) {
    var self = this;
    // urlQuery keys:
    // source_key
    // groupBy
    // searchQ
    // searchCol
    // embed
    // Other filters

    var source_pKey = urlQuery.source_key;
    var collectionPKey = process.env.NODE_ENV !== 'enterprise'? req.subdomains[0] + '-' + source_pKey : source_pKey;


    importedDataPreparation.DataSourceDescriptionWithPKey(collectionPKey)
        .then(function(dataSourceDescription) {
            // var collectionPKey = dataSourceDescription._id

            if (dataSourceDescription == null || typeof dataSourceDescription === 'undefined') {
                callback(new Error('No data source with that source pkey ' + source_pKey), null);

                return;
            }

            if (typeof dataSourceDescription.fe_views !== 'undefined' && dataSourceDescription.fe_views.views !== 'undefined' && dataSourceDescription.fe_views.views.timeline != null && dataSourceDescription.fe_views.views.timeline === false) {
                callback(new Error('View doesn\'t exist for dataset. UID? urlQuery: ' + JSON.stringify(urlQuery, null, '\t')), null);

                return;
            }

            var processedRowObjects_mongooseContext = processed_row_objects.Lazy_Shared_ProcessedRowObject_MongooseContext(dataSourceDescription._id);
            var processedRowObjects_mongooseModel = processedRowObjects_mongooseContext.Model;
            //
            var page = urlQuery.page;
            var pageNumber = page ? page : 1;
            var groupSize = urlQuery.groupSize ? parseInt(urlQuery.groupSize) : config.timelineGroupSize;
            var groupsLimit = config.pageSize / config.timelineGroupSize * 2;
            var skipNResults = groupSize === -1 ? config.pageSize * (Math.max(pageNumber, 1) - 1) : groupsLimit * (Math.max(pageNumber, 1) - 1);
            //
            var groupBy = urlQuery.groupBy; // the human readable col name - real col name derived below

            /* group by would just be decade, years, month,day */
            var defaultGroupByColumnName_humanReadable = dataSourceDescription.fe_views.views.timeline.defaultGroupByColumnName;

            // var defaultGroupByColumnName_humanReadable = dataSourceDescription.fe_displayTitleOverrides[dataSourceDescription.fe_views.views.timeline.defaultGroupByColumnName] ||
            // dataSourceDescription.fe_views.views.timeline.defaultGroupByColumnName;

            var groupBy_realColumnName = groupBy ? groupBy : dataSourceDescription.fe_views.views.timeline.defaultGroupByColumnName;

            // Set group by dropdown to default if we are viewing by all
            var colNames_orderedForGroupByDropdown;
            if (groupSize === -1) {
                colNames_orderedForGroupByDropdown = [dataSourceDescription.fe_views.views.timeline.defaultGroupByColumnName];
            } else if (dataSourceDescription.fe_views.views.timeline.durationsAvailableForGroupBy) {
                colNames_orderedForGroupByDropdown = dataSourceDescription.fe_views.views.timeline.durationsAvailableForGroupBy;
            } else {
                colNames_orderedForGroupByDropdown = {};
            }

            // importedDataPreparation.RealColumnNameFromHumanReadableColumnName(groupBy,dataSourceDescription) :
            // dataSourceDescription.fe_views.views.timeline.defaultGroupByColumnName;

            var groupByDateFormat;
            var filterDateFormat;
            //
            var sortBy = urlQuery.sortBy; // the human readable col name - real col name derived below
            var sortDir = urlQuery.sortDir;
            // var sortDirection = sortDir ? sortDir == 'Ascending' ? 1 : -1 : 1;
            var defaultSortByColumnName_humanReadable = dataSourceDescription.fe_displayTitleOverrides[dataSourceDescription.fe_views.views.timeline.defaultSortByColumnName] || dataSourceDescription.fe_views.views.timeline.defaultSortByColumnName;

            var sortBy_realColumnName = sortBy ? importedDataPreparation.RealColumnNameFromHumanReadableColumnName(sortBy, dataSourceDescription) :
                dataSourceDescription.fe_views.views.timeline.defaultSortByColumnName;

            var routePath_base = '/' + source_pKey + '/timeline';
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
            var isSearchActive = typeof searchCol !== 'undefined' && searchCol != null && searchCol != '' // Not only a column
                && typeof searchQ !== 'undefined' && searchQ != null && searchQ != ''; // but a search query
            //
            //
            var wholeFilteredSet_aggregationOperators = [];

            var _orErrDesc;
            if (isSearchActive) {
                _orErrDesc = func.activeSearch_matchOp_orErrDescription(dataSourceDescription, searchCol, searchQ);
                if (typeof _orErrDesc.err !== 'undefined') {
                    callback(_orErrDesc.err, null);

                    return;
                }
                wholeFilteredSet_aggregationOperators = wholeFilteredSet_aggregationOperators.concat(_orErrDesc.matchOps);
            }
            if (isFilterActive) {
                _orErrDesc = func.activeFilter_matchOp_orErrDescription_fromMultiFilter(dataSourceDescription, filterObj);
                if (typeof _orErrDesc.err !== 'undefined') {
                    callback(_orErrDesc.err, null);

                    return;
                }
                wholeFilteredSet_aggregationOperators = wholeFilteredSet_aggregationOperators.concat(_orErrDesc.matchOps);
            }

            var groupBySortFieldPath = 'results.rowParams.' + sortBy_realColumnName;
            var groupByColumnName = groupBy ? groupBy : defaultGroupByColumnName_humanReadable;
            var groupByDuration;

            switch (groupByColumnName) {
            case 'Decade':
                groupByDuration = moment.duration(10, 'years').asMilliseconds();
                groupByDateFormat = 'YYYY';
                filterDateFormat = 'YYYY';
                break;

            case 'Year':
                groupByDuration = moment.duration(1, 'years').asMilliseconds();
                groupByDateFormat = 'YYYY';
                filterDateFormat = 'YYYY';
                break;

            case 'Month':
                groupByDuration = moment.duration(1, 'months').asMilliseconds();
                groupByDateFormat = 'MMMM YYYY';
                filterDateFormat = 'YYYY-MM-DD';
                break;

            case 'Day':
                groupByDuration = moment.duration(1, 'days').asMilliseconds();
                groupByDateFormat = 'MMMM Do YYYY';
                filterDateFormat = 'YYYY-MM-DD';
                break;

            default:
                groupByDuration = moment.duration(1, 'years').asMilliseconds();
                groupByDateFormat = 'YYYY';
                filterDateFormat = 'YYYY-MM-DD';
            }

            var sourceDoc, sampleDoc, uniqueFieldValuesByFieldName, nonpagedCount = 0, groupedResults = [];

            var batch = new Batch();
            batch.concurrency(1);

            // Obtain source document
            batch.push(function(done) {
                raw_source_documents.Model.findOne({ primaryKey: dataSourceDescription._id }, function(err, _sourceDoc) {
                    if (err) {
                        console.log("error obtaining source document");
                        return done(err);
                    }

                    sourceDoc = _sourceDoc;
                    done();
                });
            });

            // Obtain sample document
            batch.push(function (done) {
                processedRowObjects_mongooseModel.findOne({}, function (err, _sampleDoc) {
                    if (err) {
                        console.log("error obtaining sample document");
                        return done(err);
                    }

                    sampleDoc = _sampleDoc;
                    done();
                });
            });

            // Obtain Top Unique Field Values For Filtering
            batch.push(function (done) {
                func.topUniqueFieldValuesForFiltering(dataSourceDescription, function (err, _uniqueFieldValuesByFieldName) {
                    if (err) {
                        console.log("error obtaining top unique field values for filtering");
                        return done(err);
                    }

                    uniqueFieldValuesByFieldName = _uniqueFieldValuesByFieldName;
                    done();
                });
            });

            // Count whole set
            batch.push(function(done) {
                var countWholeFilteredSet_aggregationOperators;
                if ( groupSize === -1 ) {
                    countWholeFilteredSet_aggregationOperators = wholeFilteredSet_aggregationOperators.concat([{ // Count
                        $group: {
                            _id: 1,
                            count: {$sum: 1}
                        }
                    }]);
                } else {
                    countWholeFilteredSet_aggregationOperators = wholeFilteredSet_aggregationOperators.concat([{ // Count
                        $group: {
                            // _id: 1,
                            _id: {
                                "$subtract": [
                                    {"$subtract": [new Date(), "$" + "rowParams." + sortBy_realColumnName]},
                                    {
                                        "$mod": [
                                            {"$subtract": [new Date(), "$" + "rowParams." + sortBy_realColumnName]},
                                            groupByDuration
                                        ]
                                    }
                                ]
                            }
                        }
                    }]);
                }

                var doneFn = function(err, results) {
                    if (err) {
                        console.log('error counting whole set');
                        return done(err);
                    }

                    if (results == undefined || results == null) {
                        // 0
                    } else if ( groupSize === -1 ) {
                        nonpagedCount = results[0].count;
                    } else {
                        nonpagedCount = results.length;
                    }

                    done();
                };

                processedRowObjects_mongooseModel.aggregate(countWholeFilteredSet_aggregationOperators).allowDiskUse(true) /* or we will hit mem limit on some pages*/ .exec(doneFn);
            });

            // Obtain Grouped results
            batch.push(function (done) {
                var aggregationOperators = [];
                var _orErrDesc;
                if (isSearchActive) {
                    _orErrDesc = func.activeSearch_matchOp_orErrDescription(dataSourceDescription, searchCol, searchQ);
                    if (_orErrDesc.err) return done(_orErrDesc.err);

                    aggregationOperators = aggregationOperators.concat(_orErrDesc.matchOps);
                }
                if (isFilterActive) { // rules out undefined filterCol
                    _orErrDesc = func.activeFilter_matchOp_orErrDescription_fromMultiFilter(dataSourceDescription, filterObj);
                    if (_orErrDesc.err) return done(_orErrDesc.err, null);

                    aggregationOperators = aggregationOperators.concat(_orErrDesc.matchOps);
                }

                var sort = {};
                sort[groupBySortFieldPath] = -1;

                var projects = {
                    $project: {
                        _id: 1,
                        pKey: 1,
                        srcDocPKey: 1
                    }
                };

                // Exclude the nested pages fields to reduce the amount of data returned
                var rowParamsfields = Object.keys(sampleDoc.rowParams);
                rowParamsfields.forEach(function(rowParamsField) {
                    if (rowParamsField == sortBy_realColumnName || dataSourceDescription.fe_nestedObject == null || rowParamsField.indexOf(dataSourceDescription.fe_nestedObject.prefix) == -1) {
                        projects['$project']['rowParams.' + rowParamsField] = 1;
                    }
                });

                // Show all if groupSize is -1
                if (groupSize === -1) {
                    
                    aggregationOperators = aggregationOperators.concat(
                        [
                            projects,
                            {$unwind: "$" + "rowParams." + sortBy_realColumnName}, // requires MongoDB 3.2, otherwise throws an error if non-array
                            { // unique/grouping and summing stage
                                $group: {
                                    _id: 1,
                                    startDate: {$min: "$" + "rowParams." + sortBy_realColumnName},
                                    endDate: {$max: "$" + "rowParams." + sortBy_realColumnName},
                                    total: {$sum: 1}, // the count
                                    results: {$push: "$$ROOT"}
                                },
                            },
                            { // reformat
                                $project: {
                                    _id: 0,
                                    startDate: 1,
                                    endDate: 1,
                                    total: 1,
                                    results: {
                                        $slice: ["$results", skipNResults, config.pageSize]
                                    }
                                }
                            },
                            {
                                $sort: sort
                            },
                        ]);

                } else {

                    aggregationOperators = aggregationOperators.concat(
                        [
                            projects,
                            {$unwind: "$" + "rowParams." + sortBy_realColumnName}, // requires MongoDB 3.2, otherwise throws an error if non-array
                            { // unique/grouping and summing stage
                                $group: {
                                    _id: {
                                        "$subtract": [
                                            {"$subtract": [new Date(), "$" + "rowParams." + sortBy_realColumnName]},
                                            {
                                                "$mod": [
                                                    {"$subtract": [new Date(), "$" + "rowParams." + sortBy_realColumnName]},
                                                    groupByDuration
                                                ]
                                            }
                                        ]
                                    },
                                    startDate: {$min: "$" + "rowParams." + sortBy_realColumnName},
                                    endDate: {$max: "$" + "rowParams." + sortBy_realColumnName},
                                    total: {$sum: 1}, // the count
                                    results: {$push: "$$ROOT"}
                                }
                            },
                            { // reformat
                                $project: {
                                    _id: 0,
                                    startDate: 1,
                                    endDate: 1,
                                    total: 1,
                                    results: { $slice: ["$results", groupSize] }
                                }
                            },
                            {
                                $sort: sort
                            },
                            // Pagination
                            {$skip: skipNResults},
                            {$limit: groupsLimit}
                        ]);
                }

                var doneFn = function(err, _groupedResults) {
                    if (err) {
                        console.log("error obtaining grouped results");
                        return done(err);
                    }


                    if (_groupedResults == undefined || _groupedResults == null) _groupedResults = [];

                    _groupedResults.forEach(function(el, i, arr) {
                        var results = [];
                        el.results.forEach(function(el2, i2) {
                            var displayableVal = func.ValueToExcludeByOriginalKey(
                                el2.rowParams[sortBy_realColumnName], dataSourceDescription, sortBy_realColumnName, 'timeline');

                            //Format the date value
                            el2.rowParams[sortBy_realColumnName] = func.convertDateToBeRecognizable(displayableVal, sortBy_realColumnName, dataSourceDescription);

                            results.push(el2);
                        });
                        el.results = results;
                        groupedResults.push(el);
                        
                    });

                    done();
                };

                processedRowObjects_mongooseModel.aggregate(aggregationOperators).allowDiskUse(true)/* or we will hit mem limit on some pages*/.exec(doneFn);
            });

            var galleryItem_htmlWhenMissingImage;

            if (dataSourceDescription.fe_views.views.timeline.galleryItemConditionsForIconWhenMissingImage) {
                var cond = dataSourceDescription.fe_views.views.timeline.galleryItemConditionsForIconWhenMissingImage;

                var checkConditionAndApplyClasses = function(conditions, value, multiple) {

                    if (typeof value == 'undefined' || value == '' || value == null) {
                        return '<span class="icon-tile-null"></span>';
                    }
                    for (var i = 0; i < conditions.length; i++) {


                        if (value == conditions[i].value) {

                            if (conditions[i].applyIconFromUrl) {
                                if (multiple) {
                                    return '<img class="icon-tile category-icon-2" src="https://' + process.env.AWS_S3_BUCKET + '.s3.amazonaws.com/' + dataSourceDescription._team.subdomain + conditions[i].applyIconFromUrl + '">';
                                }

                                return '<img class="icon-tile" src="https://' + process.env.AWS_S3_BUCKET + '.s3.amazonaws.com/' + dataSourceDescription._team.subdomain + conditions[i].applyIconFromUrl + '">';
                            } else if (conditions[i].applyClass) {
                                // hard coded color-gender , as it is the only default icon category for now
                                return '<span class="' + conditions[i].applyClass + ' color-gender"></span>';
                            }

                        }
                    }
                    return null;
                };


                galleryItem_htmlWhenMissingImage = function(rowObject) {
                    var fieldName = cond.field;
                    var conditions = cond.conditions;
                    var htmlElem = '';

                    var fieldValue = rowObject['rowParams'][fieldName];

                    if (Array.isArray(fieldValue) === true) {
                        for (var i = 0; i < fieldValue.length; i++) {
                            htmlElem += checkConditionAndApplyClasses(conditions, fieldValue[i], true);
                        }

                    } else if (typeof fieldValue == 'string') {
                        htmlElem = checkConditionAndApplyClasses(conditions, fieldValue);

                    }
                    return htmlElem;
                };
            }



            var user = null;
            batch.push(function(done) {
                if (req.user) {
                    User.findById(req.user, function(err, doc) {
                        if (err) {
                            console.log("error finding user");
                            return done(err);
                        }
                        user = doc;
                        done();
                    });
                } else {
                    done();
                }
            });


            batch.end(function (err) {
                if (err) return callback(err);



                var data = {
                    env: process.env,

                    user: user,

                    datasetId: dataSourceDescription._id,
           
                    arrayTitle: dataSourceDescription.title,
                    array_source_key: source_pKey,
                    team: dataSourceDescription._team ? dataSourceDescription._team : null,
                    brandColor: dataSourceDescription.brandColor,
                    brandWhiteText: func.useLightBrandText(dataSourceDescription.brandColor),
                    brandContentColor: func.calcContentColor(dataSourceDescription.brandColor),
                    sourceDoc: sourceDoc,
                    sourceDocURL: sourceDocURL,
                    view_visibility: dataSourceDescription.fe_views.views ? dataSourceDescription.fe_views.views : {},
                    view_description: dataSourceDescription.fe_views.views.timeline.description ? dataSourceDescription.fe_views.views.timeline.description : '',
                    viewAllLinkTo: dataSourceDescription.fe_views.views.gallery ? 'gallery' : 'timeline',
                    //
                    onPageNum: pageNumber,
                    numPages: groupSize === -1 ? Math.ceil(nonpagedCount / config.pageSize) : Math.ceil(nonpagedCount / groupsLimit),
                    nonpagedCount: nonpagedCount,
                    //
                    fieldKey_objectTitle: dataSourceDescription.objectTitle,
                    humanReadableColumnName_objectTitle: importedDataPreparation.HumanReadableColumnName_objectTitle,



                    //


                    hasThumbs:  (dataSourceDescription.fe_image.field) ? true: false,
                    fieldKey_medThumbImageURL: dataSourceDescription.fe_image.field,
                    scrapedImages: dataSourceDescription.fe_image.scraped,


                    //
                    groupedResults: groupedResults,
                    groupBy: groupBy,
                    groupBy_realColumnName: groupBy_realColumnName,
                    groupSize: groupSize,
                    groupByDateFormat: groupByDateFormat,
                    filterDateFormat: filterDateFormat,
                    displayTitleOverrides:  _.cloneDeep(dataSourceDescription.fe_displayTitleOverrides),
                    //
                    sortBy: sortBy,
                    sortDir: sortDir,
                    defaultSortByColumnName_humanReadable: defaultSortByColumnName_humanReadable,
                    sortBy_realColumnName: sortBy_realColumnName,
                    colNames_orderedForTimelineSortByDropdown: importedDataPreparation.HumanReadableFEVisibleColumnNamesWithSampleRowObject_orderedForDropdown(sampleDoc, dataSourceDescription, 'timeline', 'SortBy','ToDate'),
                    colNames_orderedForSortByDropdown: importedDataPreparation.HumanReadableFEVisibleColumnNamesWithSampleRowObject_orderedForSortByDropdown(sampleDoc, dataSourceDescription),
                    //
                    filterObj: filterObj,
                    isFilterActive: isFilterActive,
                    uniqueFieldValuesByFieldName: uniqueFieldValuesByFieldName,
                    truesByFilterValueByFilterColumnName_forWhichNotToOutputColumnNameInPill: truesByFilterValueByFilterColumnName_forWhichNotToOutputColumnNameInPill,
                    //
                    fe_galleryItem_htmlForIconFromRowObjWhenMissingImage: galleryItem_htmlWhenMissingImage,
                    //
                    searchQ: searchQ,
                    searchCol: searchCol,
                    isSearchActive: isSearchActive,
                    //
                    defaultGroupByColumnName_humanReadable: defaultGroupByColumnName_humanReadable,
                    colNames_orderedForGroupByDropdown: colNames_orderedForGroupByDropdown,
                    //
                    routePath_base: routePath_base,
                    // multiselectable filter fields
                    multiselectableFilterFields: dataSourceDescription.fe_filters.fieldsMultiSelectable,

                    tooltipDateFormat: dataSourceDescription.fe_views.views.timeline.tooltipDateFormat || null,
                    defaultView: config.formatDefaultView(dataSourceDescription.fe_views.default_view)

                };

                callback(err, data);

            });
        });
};
