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
    // groupBy
    // searchQ
    // searchCol
    // Other filters
    var source_pKey = urlQuery.source_key;
    var dataSourceDescription = importedDataPreparation.DataSourceDescriptionWithPKey(source_pKey, self.context.raw_source_documents_controller);
    if (dataSourceDescription == null || typeof dataSourceDescription === 'undefined') {
        callback(new Error("No data source with that source pkey " + source_pKey), null);

        return;
    }

    var team = importedDataPreparation.TeamDescription(dataSourceDescription.team_id);

    if (typeof dataSourceDescription.fe_views !== 'undefined' && dataSourceDescription.fe_views.chart != null && dataSourceDescription.fe_views.chart === false) {
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
    var defaultGroupByColumnName_humanReadable = dataSourceDescription.fe_wordCloud_defaultGroupByColumnName_humanReadable;
    var keywords = dataSourceDescription.fe_wordCloud_keywords;
    //
    var routePath_base              = "/array/" + source_pKey + "/word-cloud";
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

    //
    var sourceDoc, sampleDoc, uniqueFieldValuesByFieldName, nonpagedCount = 0, groupedResults = [];

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

    // Obtain grouped results
    batch.push(function(done) {
        var groupBy_realColumnName = importedDataPreparation.RealColumnNameFromHumanReadableColumnName(groupBy ? groupBy : defaultGroupByColumnName_humanReadable,
            dataSourceDescription);
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

        //
        var doneFn = function(err, _groupedResults)
        {
            if (err) return done(err);

            var result = _groupedResults[0];
            groupedResults = keywords.map(function(keyword) {
                var obj = {_id: keyword, value: 0};
                if (result && result[keyword]) obj.value = result[keyword];
                return obj;
            });

            groupedResults.sort(function(a, b){
                return b.value - a.value;
            });

            done();
        };

        var groupBy_realColumnName_path = "rowParams." + groupBy_realColumnName;
        var groupOps_keywords = { _id: null };
        keywords.forEach(function(keyword) {
            groupOps_keywords[keyword] = {
                $sum: {
                    $cond: [
                        "$wordExistence." + groupBy_realColumnName + "." + keyword, 1, 0
                    ]
                }
            }
        });
        aggregationOperators = aggregationOperators.concat([
            { $group: groupOps_keywords }
        ]);

        processedRowObjects_mongooseModel.aggregate(aggregationOperators).allowDiskUse(true)/* or we will hit mem limit on some pages*/.exec(doneFn);
    });

    batch.end(function (err) {
        if (err) return callback(err);

        //
        var minGroupedResultsValue = Math.min.apply(Math, groupedResults.map(function(o){ return o.value; }));
        var maxGroupedResultsValue = Math.max.apply(Math, groupedResults.map(function(o){ return o.value; }));
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
            groupedResults: groupedResults,
            minGroupedResultsValue: minGroupedResultsValue,
            maxGroupedResultsValue: maxGroupedResultsValue,
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
            colNames_orderedForGroupByDropdown: importedDataPreparation.HumanReadableFEVisibleColumnNamesWithSampleRowObject_orderedForwordCloudGroupByDropdown(sampleDoc, dataSourceDescription),
            colNames_orderedForSortByDropdown: importedDataPreparation.HumanReadableFEVisibleColumnNamesWithSampleRowObject_orderedForSortByDropdown(sampleDoc, dataSourceDescription),
            //
            routePath_base: routePath_base,
            // multiselectable filter fields
            multiselectableFilterFields: dataSourceDescription.fe_filters_fieldsMultiSelectable
        };
        callback(err, data);
    });
};

module.exports = constructor;