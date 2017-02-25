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
var User = require('../../../models/users');

module.exports.BindData = function (req, urlQuery, callback) {
    var self = this;
    // urlQuery keys:
    // source_key
    // page
    // sortBy
    // sortDir
    // searchQ
    // searchCol
    // embed
    // Other filters
    var source_pKey = urlQuery.source_key;
    var collectionPKey = process.env.NODE_ENV !== 'enterprise'? req.subdomains[0] + '-' + source_pKey : source_pKey;




    importedDataPreparation.DataSourceDescriptionWithPKey(collectionPKey)
        .then(function (dataSourceDescription) {




            if (dataSourceDescription == null || typeof dataSourceDescription === 'undefined') {
                callback(new Error("No data source with that source pkey " + source_pKey), null);
                return;
            }

            if (typeof dataSourceDescription.fe_views !== 'undefined' && dataSourceDescription.fe_views.views != null && typeof dataSourceDescription.fe_views.views.gallery === 'undefined') {
                callback(new Error('View doesn\'t exist for dataset. UID? urlQuery: ' + JSON.stringify(urlQuery, null, '\t')), null);
                return;
            }
            var galleryViewSettings = dataSourceDescription.fe_views.views.gallery;

            var processedRowObjects_mongooseContext = processed_row_objects.Lazy_Shared_ProcessedRowObject_MongooseContext(dataSourceDescription._id);
            var processedRowObjects_mongooseModel = processedRowObjects_mongooseContext.Model;

            var galleryItem_htmlWhenMissingImage;

            if (galleryViewSettings.galleryItemConditionsForIconWhenMissingImage) {
                var cond = galleryViewSettings.galleryItemConditionsForIconWhenMissingImage;

                var checkConditionAndApplyClasses = function (conditions, value, multiple) {


                    if (typeof value == 'undefined' || value == "" || value == null) {
                        return '<span class="icon-tile-null"></span>';
                    }
                    for (var i = 0; i < conditions.length; i++) {


                        if (value == conditions[i].value) {
                            if (conditions[i].applyIconFromUrl) {
                                if (multiple) {
                                    return "<img class='icon-tile category-icon-2' src='https://" + process.env.AWS_S3_BUCKET + ".s3.amazonaws.com/" + dataSourceDescription._team.subdomain + conditions[i].applyIconFromUrl + "'>"
                                }

                                return "<img class='icon-tile' src='https://" + process.env.AWS_S3_BUCKET + ".s3.amazonaws.com/" + dataSourceDescription._team.subdomain + conditions[i].applyIconFromUrl + "'>"
                            } else if (conditions[i].applyClass) {
                                // hard coded color-gender , as it is the only default icon category for now
                                return "<span class='" + conditions[i].applyClass + " color-gender'></span>";
                            }
                        }
                    }
                    return null;
                };

                galleryItem_htmlWhenMissingImage = function (rowObject) {
                    var fieldName = cond.field;
                    var conditions = cond.conditions;
                    var htmlElem = "";


                    var fieldValue = rowObject["rowParams"][fieldName];


                    if (Array.isArray(fieldValue) === true) {


                        for (var i = 0; i < fieldValue.length; i++) {
                            htmlElem += checkConditionAndApplyClasses(conditions, fieldValue[i],true);
                        }

                    } else if (typeof fieldValue == "string") {
                        htmlElem = checkConditionAndApplyClasses(conditions, fieldValue);

                    }
                    return htmlElem;
                };

            }

            var galleryItemBackgroundColor;

            if (galleryViewSettings.galleryItemConditionsForBackgroundColor) {
                var cond = galleryViewSettings.galleryItemConditionsForBackgroundColor;

                galleryItemBackgroundColor = function (rowObject) {
                    var fieldName = cond.field;
                    var conditions = cond.conditions;

                    var fieldValue = rowObject["rowParams"][fieldName];

                    for (var i = 0; i < conditions.length; i++) {
                        if (conditions[i].value == fieldValue) {
                            return {
                                backgroundColor: conditions[i].backgroundColor,
                                contentColor: func.calcContentColor(conditions[i].backgroundColor)
                            };
                        }
                    }
                    
                    return {
                        backgroundColor: '#FFF',
                        contentColor: '#000'
                    };
                }
            }

            
            var page = urlQuery.page;
            var pageNumber = page ? page : 1;
            var skipNResults = config.pageSize * (Math.max(pageNumber, 1) - 1);
            var limitToNResults = config.pageSize;

            var sortBy = urlQuery.sortBy; // the human readable col name - real col name derived below
            
            var defaultSortByColumnName_humanReadable = dataSourceDescription.fe_displayTitleOverrides[galleryViewSettings.defaultSortByColumnName] || galleryViewSettings.defaultSortByColumnName;

            var sortBy_realColumnName = sortBy? importedDataPreparation.RealColumnNameFromHumanReadableColumnName(sortBy,dataSourceDescription) : 
            (dataSourceDescription.fe_views.views.gallery.defaultSortByColumnName == 'Object Title') ? importedDataPreparation.RealColumnNameFromHumanReadableColumnName(dataSourceDescription.fe_views.views.gallery.defaultSortByColumnName,dataSourceDescription) :
             dataSourceDescription.fe_views.views.gallery.defaultSortByColumnName;

            var sortDir = urlQuery.sortDir;
            var sortDirection = sortDir ? sortDir == 'Ascending' ? 1 : -1 : dataSourceDescription.fe_views.views.gallery.defaultSortOrderDescending ? -1 : 1;
      

            //
            var routePath_base = "/" + source_pKey + "/gallery";
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
            //
            var wholeFilteredSet_aggregationOperators = [];
            if (isSearchActive) {
                var _orErrDesc = func.activeSearch_matchOp_orErrDescription(dataSourceDescription, searchCol, searchQ);
                if (typeof _orErrDesc.err !== 'undefined') {
                    callback(_orErrDesc.err, null);

                    return;
                }

                wholeFilteredSet_aggregationOperators = wholeFilteredSet_aggregationOperators.concat(_orErrDesc.matchOps);
            }
            if (isFilterActive) {
                var _orErrDesc = func.activeFilter_matchOp_orErrDescription_fromMultiFilter(dataSourceDescription, filterObj);
                if (typeof _orErrDesc.err !== 'undefined') {
                    callback(_orErrDesc.err, null);

                    return;
                }

            
                wholeFilteredSet_aggregationOperators = wholeFilteredSet_aggregationOperators.concat(_orErrDesc.matchOps);
            }

            var sourceDoc, sampleDoc, uniqueFieldValuesByFieldName, nonpagedCount = 0, docs;


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

            // Count whole set
            batch.push(function (done) {
                var countWholeFilteredSet_aggregationOperators = wholeFilteredSet_aggregationOperators.concat([
                    { // Count
                        $group: {
                            _id: 1,
                            count: {$sum: 1}
                        }
                    }
                ]);
                var doneFn = function (err, results) {

                    if (err) return done(err);


                    if (results == undefined || results == null || results.length == 0) { // 0
                    } else {
                        nonpagedCount = results[0].count;
                    }
                    done();
                };
                processedRowObjects_mongooseModel.aggregate(countWholeFilteredSet_aggregationOperators).allowDiskUse(true)/* or we will hit mem limit on some pages*/.exec(doneFn);
            });

            // Obtain Paged Docs
            batch.push(function (done) {
                var sortBy_realColumnName_path = "rowParams." + sortBy_realColumnName;
                var sortOpParams = {};
                sortOpParams.size = -sortDirection;
                sortOpParams[sortBy_realColumnName_path] = sortDirection;

                var projects = {
                    $project: {
                        _id: 1,
                        pKey: 1,
                        srcDocPKey: 1,
                        size: {
                            $cond: {
                                if: {$isArray: "$" + sortBy_realColumnName_path},
                                then: {$size: "$" + sortBy_realColumnName_path}, // gets the number of items in the array
                                else: 0
                            }
                        }
                    }
                };

                // Exclude the nested pages fields to reduce the amount of data returned
                var rowParamsfields = Object.keys(sampleDoc.rowParams);


                rowParamsfields.forEach(function (rowParamsField) {
                    if (dataSourceDescription.fe_nestedObject == null || rowParamsField.indexOf(dataSourceDescription.fe_nestedObject.prefix) == -1) {
                        projects['$project']['rowParams.' + rowParamsField] = 1;
                    }
                });

  

                var pagedDocs_aggregationOperators = wholeFilteredSet_aggregationOperators.concat([
                    projects,
                    // Sort (before pagination):
                    {$sort: sortOpParams},
                    // Pagination
                    {$skip: skipNResults},
                    {$limit: limitToNResults}
                ]);


                var doneFn = function (err, _docs) {

                    if (err) return done(err);

                    docs = _docs;
                    if (docs == undefined || docs == null) {
                        docs = [];
                    }



                    done();
                };


                // Next, get the full set of sorted results
                processedRowObjects_mongooseModel
                    .aggregate(pagedDocs_aggregationOperators)
                    .allowDiskUse(true)// or we will hit mem limit on some pages
                    .exec(doneFn);
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



                var data =
                {
                    env: process.env,

                    user: user,

                    arrayTitle: dataSourceDescription.title,
                    array_source_key: source_pKey,
                    team: dataSourceDescription._team ? dataSourceDescription._team : null,
                    datasetId: dataSourceDescription._id,

                



                    brandColor: dataSourceDescription.brandColor,
                    // brandContentColor: func.calcContentColor(dataSourceDescription.brandColor),
                    brandWhiteText: func.useLightBrandText(dataSourceDescription.brandColor), 
                    sourceDoc: sourceDoc,
                    displayTitleOverrides:  _.cloneDeep(dataSourceDescription.fe_displayTitleOverrides),
                    sourceDocURL: dataSourceDescription.urls ? dataSourceDescription.urls.length > 0 ? dataSourceDescription.urls[0] : null : null,


                    view_visibility: dataSourceDescription.fe_views.views ? dataSourceDescription.fe_views.views : {},
                    view_description: dataSourceDescription.fe_views.views.gallery.description ? dataSourceDescription.fe_views.views.gallery.description : "",
                    //
                    pageSize: config.pageSize < nonpagedCount ? config.pageSize : nonpagedCount,
                    onPageNum: pageNumber,
                    numPages: Math.ceil(nonpagedCount / config.pageSize),
                    nonpagedCount: nonpagedCount,
                    resultsOffset: (pageNumber - 1) * config.pageSize,
                    //
                    docs: docs,
                    //
                    fieldKey_objectTitle: dataSourceDescription.objectTitle,
                    humanReadableColumnName_objectTitle: importedDataPreparation.HumanReadableColumnName_objectTitle,

                   
                    hasThumbs:  (dataSourceDescription.fe_image.field) ? true: false,
                    fieldKey_medThumbImageURL: dataSourceDescription.fe_image.field,
                    scrapedImages: dataSourceDescription.fe_image.scraped,
                   
                    sortBy: sortBy,
                    sortDir: sortDir,
                    defaultSortByColumnName_humanReadable: defaultSortByColumnName_humanReadable,
                    defaultSortOrderDescending: dataSourceDescription.fe_views.views.gallery.defaultSortOrderDescending,
                    colNames_orderedForGallerySortByDropdown: importedDataPreparation.HumanReadableFEVisibleColumnNamesWithSampleRowObject_orderedForDropdown(sampleDoc, dataSourceDescription, 'gallery', 'SortBy'),
                    colNames_orderedForSortByDropdown: importedDataPreparation.HumanReadableFEVisibleColumnNamesWithSampleRowObject_orderedForSortByDropdown(sampleDoc, dataSourceDescription),
                    //
                    filterObj: filterObj,
                    isFilterActive: isFilterActive,
                    uniqueFieldValuesByFieldName: uniqueFieldValuesByFieldName,
                    truesByFilterValueByFilterColumnName_forWhichNotToOutputColumnNameInPill: truesByFilterValueByFilterColumnName_forWhichNotToOutputColumnNameInPill,
                    //
                    fe_galleryItem_useBackgroundColor: galleryViewSettings.defaultGalleryConditionalBackground,
                    fe_galleryItem_htmlForIconFromRowObjWhenMissingImage: galleryItem_htmlWhenMissingImage,
                    fe_galleryItem_backgroundColorForRowObj: galleryItemBackgroundColor,
                    fe_galleryItem_secondaryColumnDisplay: galleryViewSettings.secondaryColumnTileDisplay,
                    //
                    searchQ: searchQ,
                    searchCol: searchCol,
                    isSearchActive: isSearchActive,
                    //
                    routePath_base: routePath_base,
                    // multiselectable filter fields
                    multiselectableFilterFields: dataSourceDescription.fe_filters.fieldsMultiSelectable,
                };


                callback(null, data);
            });

        })
        .catch(function (err) {
            //error handling

            winston.error("❌  cannot bind Data to the view, error: ", err);
        })

};
