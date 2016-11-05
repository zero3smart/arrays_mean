var winston = require('winston');
var queryString = require('querystring');
var _ = require('lodash');
//
var importedDataPreparation = require('../../../datasources/utils/imported_data_preparation');
var import_datatypes = require('../../../datasources/utils/import_datatypes');
var raw_source_documents = require('../../../models/raw_source_documents');
var processed_row_objects = require('../../../models/processed_row_objects');
var config = require('../config');
var func = require('../func');

/**
 * Scatterplot view action controller.
 * @param {Object} urlQuery - URL params
 * @param {Function} callback
 */
module.exports.BindData = function (req, urlQuery, callback) {
    var self = this;

    var sourceKey = urlQuery.source_key;
    var dataSourceDescription = importedDataPreparation.DataSourceDescriptionWithPKey(sourceKey);

    importedDataPreparation.DataSourceDescriptionWithPKey(sourceKey)
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
                .Lazy_Shared_ProcessedRowObject_MongooseContext(sourceKey);
            /*
             * Stash somewhat model reference.
             */
            var processedRowObjects_mongooseModel = processedRowObjects_mongooseContext.Model;

            var filterObj = func.filterObjFromQueryParams(urlQuery);
            var isFilterActive = Object.keys(filterObj).length != 0;

            var urlQuery_forSwitchingViews = "";
            var appendQuery = "";
            /*
             * Check filter active and update composed URL params.
             */
            if (isFilterActive) {
                appendQuery = queryString.stringify(filterObj);
                urlQuery_forSwitchingViews = func.urlQueryByAppendingQueryStringToExistingQueryString(urlQuery_forSwitchingViews, appendQuery);
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
                urlQuery_forSwitchingViews = func.urlQueryByAppendingQueryStringToExistingQueryString(urlQuery_forSwitchingViews, appendQuery);
            }
            /*
             * Process filterObj and prepare $match - https://docs.mongodb.com/manual/reference/operator/aggregation/match/ -
             * statement. May return error instead required statement... and i can't say that understand that logic full. But in that case
             * we just will create empty $match statement which acceptable for all documents from data source.
             */
            var _orErrDesc = func.activeFilter_matchOp_orErrDescription_fromMultiFilter(dataSourceDescription, filterObj);
            if (_orErrDesc.err) {
                _orErrDesc.matchOps = [{$match: {}}];
            }
            /*
             * Run chain of function to collect necessary data.
             */
            raw_source_documents.Model.findOne({primaryKey: sourceKey}, function (err, sourceDoc) {
                /*
                 * Run query to mongo to obtain all rows which satisfy to specified filters set.
                 */
                processedRowObjects_mongooseModel.aggregate(_orErrDesc.matchOps).allowDiskUse(true).exec(function (err, documents) {
                    /*
                     * Get single/sample document.
                     */
                    var sampleDoc = documents[0];
                    /*
                     * Go deeper - collect data for filter's sidebar.
                     */
                    func.topUniqueFieldValuesForFiltering(sourceKey, dataSourceDescription, function (err, _uniqueFieldValuesByFieldName) {

                        var uniqueFieldValuesByFieldName = {}
                        _.forOwn(_uniqueFieldValuesByFieldName, function (columnValue, columnName) {
                            var raw_rowObjects_coercionSchema = dataSourceDescription.raw_rowObjects_coercionScheme;
                            if (raw_rowObjects_coercionSchema && raw_rowObjects_coercionSchema[columnName]) {
                                var row = [];
                                columnValue.forEach(function (rowValue) {
                                    row.push(import_datatypes.OriginalValue(raw_rowObjects_coercionSchema[columnName], rowValue));
                                });
                                row.sort();
                                uniqueFieldValuesByFieldName[columnName] = row;
                            } else {
                                uniqueFieldValuesByFieldName[columnName] = columnValue;
                            }

                            if (dataSourceDescription.fe_filters.fieldsSortableByInteger && dataSourceDescription.fe_filters.fieldsSortableByInteger.indexOf(columnName) != -1) { // Sort by integer

                                uniqueFieldValuesByFieldName[columnName].sort(function (a, b) {
                                    a = a.replace(/\D/g, '');
                                    a = a == '' ? 0 : parseInt(a);
                                    b = b.replace(/\D/g, '');
                                    b = b == '' ? 0 : parseInt(b);
                                    return a - b;
                                });

                            } else // Sort alphabetically by default
                                uniqueFieldValuesByFieldName[columnName].sort(function (a, b) {
                                    return a - b;
                                });
                        });
                        /*
                         * Define numeric fields list which may be used as plot axes.
                         * Filter it depending in fe_scatterplot_fieldsNotAvailable config option.
                         */
                        var numericFields = importedDataPreparation.HumanReadableFEVisibleColumnNamesWithSampleRowObject_orderedForDropdown(sampleDoc, dataSourceDescription, 'scatterplot').filter(function (i) {
                            return dataSourceDescription.fe_views.views.scatterplot.fieldsNotAvailable.indexOf(i) == -1;
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
                        var routePath_base = '/array/' + sourceKey + '/scatterplot';
                        if (urlQuery.embed == 'true') routePath_base += '?embed=true';
                        /*
                         * Run callback function to finish action.
                         */
                        callback(err, {
                            env: process.env,

                            user: req.user,

                            documents: documents,
                            metaData: dataSourceDescription,
                            renderableFields: numericFields,
                            array_source_key: sourceKey,
                            team: dataSourceDescription._team ? dataSourceDescription._team : null,
                            brandColor: dataSourceDescription.brandColor,
                            uniqueFieldValuesByFieldName: uniqueFieldValuesByFieldName,
                            sourceDoc: sourceDoc,
                            view_visibility: dataSourceDescription.fe_views.views ? dataSourceDescription.fe_views.views : {},
                            view_description: dataSourceDescription.fe_views.views.scatterplot.description ? dataSourceDescription.fe_views.views.scatterplot.description : "",
                            //
                            routePath_base: routePath_base,
                            filterObj: filterObj,
                            isFilterActive: isFilterActive,
                            urlQuery_forSwitchingViews: urlQuery_forSwitchingViews,
                            searchCol: searchCol || '',
                            searchQ: searchQ || '',
                            colNames_orderedForSortByDropdown: importedDataPreparation.HumanReadableFEVisibleColumnNamesWithSampleRowObject_orderedForSortByDropdown(sampleDoc, dataSourceDescription),
                            // multiselectable filter fields
                            multiselectableFilterFields: dataSourceDescription.fe_filters.fieldsMultiSelectable
                        });


                    });
                });
            });


        })


};