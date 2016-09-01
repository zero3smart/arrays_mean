var winston = require('winston');
//
var importedDataPreparation = require('../../../datasources/utils/imported_data_preparation');
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
    // filterJSON
    // searchQ
    // searchCol
    var source_pKey = urlQuery.source_key;
    var dataSourceDescription = importedDataPreparation.DataSourceDescriptionWithPKey(source_pKey, self.context.raw_source_documents_controller);
    if (dataSourceDescription == null || typeof dataSourceDescription === 'undefined') {
        callback(new Error("No data source with that source pkey " + source_pKey), null);

        return;
    }
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
    self.context.raw_source_documents_controller.Model.findOne({ primaryKey: source_pKey }, function(err, sourceDoc)
    {
        if (err) {
            return callback(err, null);
        }
        _proceedTo_obtainSampleDocument(sourceDoc);
    });
    function _proceedTo_obtainSampleDocument(sourceDoc)
    {
        processedRowObjects_mongooseModel.findOne({}, function(err, sampleDoc)
        {
            if (err) {
                callback(err, null);

                return;
            }
            if (sampleDoc == null) {
                callback(new Error('Unexpectedly missing sample document - wrong data source UID? urlQuery: ' + JSON.stringify(urlQuery, null, '\t')), null);

                return;
            }
            _proceedTo_obtainTopUniqueFieldValuesForFiltering(sourceDoc, sampleDoc);
        });
    }
    function _proceedTo_obtainTopUniqueFieldValuesForFiltering(sourceDoc, sampleDoc)
    {
        functions._topUniqueFieldValuesForFiltering(source_pKey, dataSourceDescription, sampleDoc, function(err, uniqueFieldValuesByFieldName)
        {
            if (err) {
                callback(err, null);

                return;
            }
            //
            _proceedTo_obtainGroupedResultSet(sourceDoc, sampleDoc, uniqueFieldValuesByFieldName);
        });
    }
    function _proceedTo_obtainGroupedResultSet(sourceDoc, sampleDoc, uniqueFieldValuesByFieldName)
    {
        var groupBy_realColumnName = importedDataPreparation.RealColumnNameFromHumanReadableColumnName(groupBy ? groupBy : defaultGroupByColumnName_humanReadable,
            dataSourceDescription);
        //
        var aggregationOperators = [];
        if (isSearchActive) {
            var _orErrDesc = functions._activeSearch_matchOp_orErrDescription(dataSourceDescription, searchCol, searchQ);
            if (typeof _orErrDesc.err !== 'undefined') {
                callback(_orErrDesc.err, null);

                return;
            }
            aggregationOperators = aggregationOperators.concat(_orErrDesc.matchOps);
        }
        if (isFilterActive) { // rules out undefined filterCol
            var _orErrDesc = functions._activeFilter_matchOp_orErrDescription_fromMultiFilter(dataSourceDescription, filterObj);
            if (typeof _orErrDesc.err !== 'undefined') {
                callback(_orErrDesc.err, null);

                return;
            }
            aggregationOperators = aggregationOperators.concat(_orErrDesc.matchOps);
        }

        //
        var doneFn = function(err, groupedResults)
        {
            if (err) {
                return callback(err, null);
            }

            var result = groupedResults[0];
            var newResults = keywords.map(function(keyword) {
                var obj = {_id: keyword, value: 0};
                if (result && result[keyword]) obj.value = result[keyword];
                return obj;
            });

            newResults.sort(function(a, b){
                return b.value - a.value;
            });

            _prepareDataAndCallBack(sourceDoc, sampleDoc, uniqueFieldValuesByFieldName, newResults);
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
    }
    function _prepareDataAndCallBack(sourceDoc, sampleDoc, uniqueFieldValuesByFieldName, groupedResults)
    {
        var err = null;
        var routePath_base              = "/array/" + source_pKey + "/word-cloud";
        var sourceDocURL = dataSourceDescription.urls ? dataSourceDescription.urls.length > 0 ? dataSourceDescription.urls[0] : null : null;
        //
        var truesByFilterValueByFilterColumnName_forWhichNotToOutputColumnNameInPill = functions._new_truesByFilterValueByFilterColumnName_forWhichNotToOutputColumnNameInPill(dataSourceDescription);
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
            filterJSON_nonURIEncodedVals: filterJSON,
            filterJSON: filterJSON_uriEncodedVals,
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
            routePath_base: routePath_base
        };
        callback(err, data);
    }
};

module.exports = constructor;