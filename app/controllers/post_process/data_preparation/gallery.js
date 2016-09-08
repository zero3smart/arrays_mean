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

//
constructor.prototype.BindDataFor_array = function(urlQuery, callback)
{
    var self = this;
    // urlQuery keys:
    // source_key
    // page
    // sortBy
    // sortDir
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

    if (typeof dataSourceDescription.fe_views !== 'undefined' && dataSourceDescription.fe_views.gallery != null && dataSourceDescription.fe_views.gallery === false) {
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
    var page = urlQuery.page;
    var pageNumber = page ? page : 1;
    var skipNResults = config.pageSize * (Math.max(pageNumber, 1) - 1);
    var limitToNResults = config.pageSize;
    //
    var sortBy = urlQuery.sortBy; // the human readable col name - real col name derived below
    var defaultSortByColumnName_humanReadable = dataSourceDescription.fe_gallery_defaultSortByColumnName_humanReadable;
    var sortBy_realColumnName = importedDataPreparation.RealColumnNameFromHumanReadableColumnName(sortBy ? sortBy : defaultSortByColumnName_humanReadable, dataSourceDescription);

    var sortDir = urlQuery.sortDir;
    var sortDirection = sortDir ? sortDir == 'Ascending' ? 1 : -1 : 1;
    //
    var hasThumbs = dataSourceDescription.fe_designatedFields.medThumbImageURL ? true : false;
    var routePath_base              = "/array/" + source_pKey + "/gallery";
    //
    var truesByFilterValueByFilterColumnName_forWhichNotToOutputColumnNameInPill = functions._new_truesByFilterValueByFilterColumnName_forWhichNotToOutputColumnNameInPill(dataSourceDescription);
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
    var wholeFilteredSet_aggregationOperators = [];
    if (isSearchActive) {
        var _orErrDesc = functions._activeSearch_matchOp_orErrDescription(dataSourceDescription, searchCol, searchQ);
        if (typeof _orErrDesc.err !== 'undefined') {
            callback(_orErrDesc.err, null);

            return;
        }
        wholeFilteredSet_aggregationOperators = wholeFilteredSet_aggregationOperators.concat(_orErrDesc.matchOps);
    }
    if (isFilterActive) { // rules out undefined filterJSON
        var _orErrDesc = functions._activeFilter_matchOp_orErrDescription_fromMultiFilter(dataSourceDescription, filterObj);
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

    // Count whole set
    batch.push(function(done) {
        var countWholeFilteredSet_aggregationOperators = wholeFilteredSet_aggregationOperators.concat([
            { // Count
                $group: {
                    _id: 1,
                    count: { $sum: 1 }
                }
            }
        ]);
        var doneFn = function(err, results)
        {
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
    batch.push(function(done) {
        var sortBy_realColumnName_path = "rowParams." + sortBy_realColumnName;
        var sortOpParams = {};
        sortOpParams.size = -sortDirection;
        sortOpParams[sortBy_realColumnName_path] = sortDirection;

        var projects = { $project: {
            _id: 1,
            pKey: 1,
            srcDocPKey: 1,
            rowIdxInDoc: 1,
            size: {
                $cond: {
                    if: { $isArray: "$" + sortBy_realColumnName_path },
                    then: { $size: "$" + sortBy_realColumnName_path }, // gets the number of items in the array
                    else: 0
                }
            }
        }};

        // Exclude the nested pages fields to reduce the amount of data returned
        var rowParamsfields = Object.keys(sampleDoc.rowParams);
        rowParamsfields.forEach(function(rowParamsField) {
            if (rowParamsField.indexOf(dataSourceDescription.fe_nestedObject_prefix) === -1) {
                projects['$project']['rowParams.' + rowParamsField] = 1;
            }
        });

        var pagedDocs_aggregationOperators = wholeFilteredSet_aggregationOperators.concat([
            projects,
            // Sort (before pagination):
            { $sort: sortOpParams },
            // Pagination
            { $skip: skipNResults },
            { $limit: limitToNResults }
        ]);

        var doneFn = function(err, _docs)
        {
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
            sourceDocURL: dataSourceDescription.urls ? dataSourceDescription.urls.length > 0 ? dataSourceDescription.urls[0] : null : null,
            view_visibility: dataSourceDescription.fe_views ? dataSourceDescription.fe_views : {},
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
            filterJSON_nonURIEncodedVals: filterJSON,
            filterJSON: filterJSON_uriEncodedVals,
            isFilterActive: isFilterActive,
            uniqueFieldValuesByFieldName: uniqueFieldValuesByFieldName,
            truesByFilterValueByFilterColumnName_forWhichNotToOutputColumnNameInPill: truesByFilterValueByFilterColumnName_forWhichNotToOutputColumnNameInPill,
            //
            fe_galleryItem_htmlForIconFromRowObjWhenMissingImage: dataSourceDescription.fe_galleryItem_htmlForIconFromRowObjWhenMissingImage,
            //
            searchQ: searchQ,
            searchCol: searchCol,
            isSearchActive: isSearchActive,
            //
            routePath_base: routePath_base,
        };
        callback(null, data);
    });
};

module.exports = constructor;