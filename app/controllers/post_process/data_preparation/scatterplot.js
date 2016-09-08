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

/**
 * Scatterplot view action controller.
 * @param {Object} urlQuery - URL params
 * @param {Function} callback
 */
constructor.prototype.BindDataFor_array = function(urlQuery, callback)
{
    var self = this;

    var sourceKey = urlQuery.source_key;
    var dataSourceDescription = importedDataPreparation.DataSourceDescriptionWithPKey(
        sourceKey, self.context.raw_source_documents_controller
    );

    if (dataSourceDescription == null || typeof dataSourceDescription === 'undefined') {
        callback(new Error("No data source with that source pkey " + sourceKey), null);
        return;
    }

    var team = importedDataPreparation.TeamDescription(dataSourceDescription.team_id);

    if (typeof dataSourceDescription.fe_views !== 'undefined' && dataSourceDescription.fe_views.chart != null && dataSourceDescription.fe_views.chart === false) {
        callback(new Error('View doesn\'t exist for dataset. UID? urlQuery: ' + JSON.stringify(urlQuery, null, '\t')), null);
        return;
    }

    var fe_visible = dataSourceDescription.fe_visible;
    if (typeof fe_visible !== 'undefined' && fe_visible != null && fe_visible === false) {
        callback(new Error("That data source was set to be not visible: " + sourceKey), null);
        return;
    }
    /*
     * Get somewhat mongoose context.
     */
    var processedRowObjects_mongooseContext = self.context.processed_row_objects_controller
        .Lazy_Shared_ProcessedRowObject_MongooseContext(sourceKey);
    /*
     * Stash somewhat model reference.
     */
    var processedRowObjects_mongooseModel = processedRowObjects_mongooseContext.Model;
    /*
     * Process URL filterJSON param.
     */
    var filterJSON = urlQuery.filterJSON;
    var filterObj = {};
    var isFilterActive = false;
    if (typeof filterJSON !== 'undefined' && filterJSON != null && filterJSON.length != 0) {
        try {
            filterObj = JSON.parse(filterJSON);
            if (typeof filterObj !== 'undefined' && filterObj != null && Object.keys(filterObj) != 0) {
                isFilterActive = true;
            }
        } catch (e) {
            winston.error("❌  Error parsing filterJSON: ", filterJSON);
            return callback(e, null);
        }
    }

    var filterJSON_uriEncodedVals = functions._new_reconstructedURLEncodedFilterObjAsFilterJSONString(filterObj);
    var urlQuery_forSwitchingViews  = "";
    var appendQuery = "";
    /*
     * Check filter active and update composed URL params.
     */
    if (isFilterActive) {
        appendQuery = "filterJSON=" + filterJSON_uriEncodedVals;
        urlQuery_forSwitchingViews = functions._urlQueryByAppendingQueryStringToExistingQueryString(urlQuery_forSwitchingViews, appendQuery);
    }

    var searchCol = urlQuery.searchCol;
    var searchQ = urlQuery.searchQ;
    var isSearchActive = typeof searchCol !== 'undefined' && searchCol != null && searchCol != ""
        && typeof searchQ !== 'undefined' && searchQ != null && searchQ != "";
    /*
     * Check search active and update composed URL params.
     */
    if (isSearchActive) {
        appendQuery = "searchCol=" + urlQuery.searchCol + "&" + "searchQ=" + urlQuery.searchQ;
        urlQuery_forSwitchingViews = functions._urlQueryByAppendingQueryStringToExistingQueryString(urlQuery_forSwitchingViews, appendQuery);
    }
    /*
     * Process parsed filterJSON param and prepare $match - https://docs.mongodb.com/manual/reference/operator/aggregation/match/ -
     * statement. May return error instead required statement... and i can't say that understand that logic full. But in that case
     * we just will create empty $match statement which acceptable for all documents from data source.
     */
    var _orErrDesc = functions._activeFilter_matchOp_orErrDescription_fromMultiFilter(dataSourceDescription, filterObj);
    if (_orErrDesc.err) {
        _orErrDesc.matchOps = [{ $match : {} }];
    }
    /*
     * Run chain of functions to collect necessary data.
     */
    self.context.raw_source_documents_controller.Model.findOne({ primaryKey: sourceKey }, function(err, sourceDoc) {
        /*
         * Run query to mongo to obtain all rows which satisfy to specified filters set.
         */
        processedRowObjects_mongooseModel.aggregate(_orErrDesc.matchOps).allowDiskUse(true).exec(function(err, documents) {
            /*
             * Get single/sample document.
             */
            var sampleDoc = documents[0];
            /*
             * Go deeper - collect data for filter's sidebar.
             */
            functions._topUniqueFieldValuesForFiltering(sourceKey, dataSourceDescription, function(err, _uniqueFieldValuesByFieldName) {

                var uniqueFieldValuesByFieldName = {}
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
                /*
                 * Define numeric fields list which may be used as scatterplot axes.
                 * Filter it depending in fe_scatterplot_fieldsNotAvailable config option.
                 */
                var numericFields = importedDataPreparation.HumanReadableFEVisibleColumnNamesWithSampleRowObject_orderedForScatterplotAxisDropdown(sampleDoc, dataSourceDescription).filter(function(i) {
                    return dataSourceDescription.fe_scatterplot_fieldsNotAvailable.indexOf(i) == -1;
                });
                /*
                 * Then loop through document's fields and get numeric.
                 * Also checking they are not in fe_scatterplot_fieldsNotAvailable config option.
                 */
                /*for (i in sampleDoc.rowParams) {
                 if (! (! isNaN(parseFloat(sampleDoc.rowParams[i])) && isFinite(sampleDoc.rowParams[i]) && i !== 'id')) {
                 continue;
                 } else if (dataSourceDescription.fe_scatterplot_fieldsNotAvailable.indexOf(i) >= 0) {
                 continue;
                 } else {
                 numericFields.push(i);
                 }
                 }*/
                /*
                 * Run callback function to finish action.
                 */
                callback(err, {
                    env: process.env,
                    documents: documents,
                    metaData: dataSourceDescription,
                    renderableFields: numericFields,
                    array_source_key: sourceKey,
                    team: team,
                    brandColor: dataSourceDescription.brandColor,
                    uniqueFieldValuesByFieldName: uniqueFieldValuesByFieldName,
                    sourceDoc: sourceDoc,
                    view_visibility: dataSourceDescription.fe_views ? dataSourceDescription.fe_views : {},
                    routePath_base: '/array/' + sourceKey + '/scatterplot',
                    filterObj: filterObj,
                    isFilterActive: isFilterActive,
                    urlQuery_forSwitchingViews: urlQuery_forSwitchingViews,
                    searchCol: searchCol || '',
                    searchQ: searchQ || '',
                    colNames_orderedForSortByDropdown: importedDataPreparation.HumanReadableFEVisibleColumnNamesWithSampleRowObject_orderedForSortByDropdown(sampleDoc, dataSourceDescription),
                    filterJSON_nonURIEncodedVals: filterJSON,
                    filterJSON: filterJSON_uriEncodedVals
                });
            });
        });
    });
}

module.exports = constructor;