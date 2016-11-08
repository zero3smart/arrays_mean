var winston = require('winston');
var Batch = require('batch');
var _ = require('lodash');
//
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
    // page
    // sortBy
    // sortDir
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

            if (typeof dataSourceDescription.fe_views !== 'undefined' && dataSourceDescription.fe_views.views != null && typeof dataSourceDescription.fe_views.views.gallery === 'undefined') {
                callback(new Error('View doesn\'t exist for dataset. UID? urlQuery: ' + JSON.stringify(urlQuery, null, '\t')), null);
                return;
            }
            var galleryViewSettings = dataSourceDescription.fe_views.views.gallery;

            var processedRowObjects_mongooseContext = processed_row_objects.Lazy_Shared_ProcessedRowObject_MongooseContext(source_pKey);
            var processedRowObjects_mongooseModel = processedRowObjects_mongooseContext.Model;

            var galleryItem_htmlWhenMissingImage;

            if (galleryViewSettings.galleryItemConditionsForIconWhenMissingImage) {
                var cond = galleryViewSettings.galleryItemConditionsForIconWhenMissingImage;

                var checkConditionAndApplyClasses = function (conditions, value, opr) {

                    for (var i = 0; i < conditions.length; i++) {
                        if (conditions[i].operator == "in" && Array.isArray(conditions[i].value)) {

                            if (conditions[i].value.indexOf(value) > 0) {

                                var string = conditions[i].applyClasses.toString();

                                var classes = string.replace(",", " ");


                                return '<span class="' + classes + '"></span>';
                            }
                        }

                        if (conditions[i].operator == "equal") {


                            if (opr !== null) {

                                if (opr == "trim") {
                                    value = value.trim();
                                }
                            }

                            if (conditions[i].value == value) {

                                var string = conditions[i].applyClasses.toString();


                                var classes = string.replace(",", " ");

                                return '<span class="' + classes + '"></span>';
                            }
                        }
                    }
                }

                var galleryItem_htmlWhenMissingImage = function (rowObject) {
                    var fieldName = cond.field;
                    var conditions = cond.conditions;
                    var htmlElem = "";


                    var fieldValue = rowObject["rowParams"][fieldName];
                    if (Array.isArray(fieldValue) == true) {
                        var opr = null

                        if (cond.operationForEachValue) opr = cond.operationForEachValue

                        for (var i = 0; i < fieldValue.length; i++) {
                            htmlElem += checkConditionAndApplyClasses(conditions, fieldValue[i], opr);
                        }

                    } else if (typeof fieldValue == "string") {
                        htmlElem = checkConditionAndApplyClasses(conditions, fieldValue)

                    }
                    return htmlElem;
                }
            }

            var page = urlQuery.page;
            var pageNumber = page ? page : 1;
            var skipNResults = config.pageSize * (Math.max(pageNumber, 1) - 1);
            var limitToNResults = config.pageSize;

            var sortBy = urlQuery.sortBy; // the human readable col name - real col name derived below
            var defaultSortByColumnName_humanReadable = dataSourceDescription.fe_displayTitleOverrides[galleryViewSettings.defaultSortByColumnName] || galleryViewSettings.defaultSortByColumnName;

            var sortBy_realColumnName = sortBy? importedDataPreparation.RealColumnNameFromHumanReadableColumnName(sortBy,dataSourceDescription) :
            dataSourceDescription.fe_views.views.gallery.defaultSortByColumnName;


        

            var sortDir = urlQuery.sortDir;
            var sortDirection = sortDir ? sortDir == 'Ascending' ? 1 : -1 : 1;
            //
            var hasThumbs = dataSourceDescription.fe_designatedFields.medThumbImageURL ? true : false;
            var routePath_base = "/array/" + source_pKey + "/gallery";
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

                    _.forOwn(_uniqueFieldValuesByFieldName, function (columnValue, columnName) {
                        /* getting illegal values list */
                        var illegalValues = [];

                        if (dataSourceDescription.fe_filters.valuesToExcludeByOriginalKey) {

                            if (dataSourceDescription.fe_filters.valuesToExcludeByOriginalKey._all) {

                                illegalValues = illegalValues.concat(dataSourceDescription.fe_filters.valuesToExcludeByOriginalKey._all);
                            }
                            var illegalValuesForThisKey = dataSourceDescription.fe_filters.valuesToExcludeByOriginalKey[columnName];
                            if (illegalValuesForThisKey) {
                                illegalValues = illegalValues.concat(illegalValuesForThisKey);
                            }
                        }


                        var raw_rowObjects_coercionSchema = dataSourceDescription.raw_rowObjects_coercionScheme;
                        var revertType = false;
                        var overwriteValue = false;


                        var row = columnValue;
                        if (raw_rowObjects_coercionSchema && raw_rowObjects_coercionSchema[columnName]) {
                            row = [];
                            revertType = true;
                        }

                        if (typeof dataSourceDescription.fe_filters.oneToOneOverrideWithValuesByTitleByFieldName !== 'undefined' &&
                            dataSourceDescription.fe_filters.oneToOneOverrideWithValuesByTitleByFieldName[columnName]) {
                            overwriteValue = true;
                        }


                        columnValue.forEach(function(rowValue,index) {


                            var existsInIllegalValueList = illegalValues.indexOf(rowValue);
                          
                            if (existsInIllegalValueList == -1) { 
                                if (revertType) {
                                    row.push(import_datatypes.OriginalValue(raw_rowObjects_coercionSchema[columnName], rowValue));   
                                }

                                if (overwriteValue) {

                                    _.forOwn(dataSourceDescription.fe_filters.oneToOneOverrideWithValuesByTitleByFieldName[columnName],function(value,key) {
                                        if (value == rowValue) {
                                            row[index] = key
                                        }
                                    })
                                }
                 


                            } else { 
                                if (!revertType) row.splice(index,1); 
                            }
                        })


                        uniqueFieldValuesByFieldName[columnName] = row;

                        if (dataSourceDescription.fe_filters.fieldsSortableByInteger && dataSourceDescription.fe_filters.fieldsSortableByInteger.indexOf(columnName) != -1) { // Sort by integer

                            uniqueFieldValuesByFieldName[columnName].sort(function (a, b) {
                                a = a.replace(/\D/g, '');
                                a = a == '' ? 0 : parseInt(a);
                                b = b.replace(/\D/g, '');
                                b = b == '' ? 0 : parseInt(b);
                                return a - b;
                            });

                        } else {// Sort alphabetically by default
                             if (typeof uniqueFieldValuesByFieldName[columnName] !== 'object') {
                                uniqueFieldValuesByFieldName[columnName].sort(function (a, b) {
                                    return a - b;
                                });

                            } else {
                                uniqueFieldValuesByFieldName[columnName].sort(function (a, b) {
                                    return a.label - b.label;
                                });

                            }
                        }


                    });



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
                        rowIdxInDoc: 1,
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


            batch.end(function (err) {

                if (err) return callback(err);

                var data =
                {
                    env: process.env,

                    user: req.user,

                    arrayTitle: dataSourceDescription.title,
                    array_source_key: source_pKey,
                    team: dataSourceDescription._team ? dataSourceDescription._team : null,
                    brandColor: dataSourceDescription.brandColor,
                    sourceDoc: sourceDoc,
                    displayTitleOverrides: dataSourceDescription.fe_displayTitleOverrides,
                    sourceDocURL: dataSourceDescription.urls ? dataSourceDescription.urls.length > 0 ? dataSourceDescription.urls[0] : null : null,


                    view_visibility: dataSourceDescription.fe_views.views ? dataSourceDescription.fe_views.views : {},
                    view_description: dataSourceDescription.fe_views.views.gallery.description ? dataSourceDescription.fe_view.views.gallery.description : "",
                    //
                    pageSize: config.pageSize < nonpagedCount ? config.pageSize : nonpagedCount,
                    onPageNum: pageNumber,
                    numPages: Math.ceil(nonpagedCount / config.pageSize),
                    nonpagedCount: nonpagedCount,
                    resultsOffset: (pageNumber - 1) * config.pageSize,
                    //
                    docs: docs,
                    //
                    fieldKey_objectTitle: dataSourceDescription.fe_designatedFields.objectTitle,
                    humanReadableColumnName_objectTitle: importedDataPreparation.HumanReadableColumnName_objectTitle,
                    //
                    hasThumbs: hasThumbs,
                    fieldKey_medThumbImageURL: hasThumbs ? dataSourceDescription.fe_designatedFields.medThumbImageURL : undefined,
                    //
                    sortBy: sortBy,
                    sortDir: sortDir,
                    defaultSortByColumnName_humanReadable: defaultSortByColumnName_humanReadable,
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
                    routePath_base: routePath_base,
                    // multiselectable filter fields
                    multiselectableFilterFields: dataSourceDescription.fe_filters.fieldsMultiSelectable
                };
                callback(null, data);
            });

        })
        .catch(function (err) {
            //error handling

            winston.error("❌  cannot bind Data to the view, error: ", err);
        })

};