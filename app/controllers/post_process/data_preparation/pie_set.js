var winston = require('winston');
var Batch = require('batch');
var queryString = require('querystring');
//
var importedDataPreparation = require('../../../datasources/utils/imported_data_preparation');
var import_datatypes = require('../../../datasources/utils/import_datatypes');
var raw_source_documents = require('../../../models/raw_source_documents');
var processed_row_objects = require('../../../models/processed_row_objects');
var config = require('../config');
var func = require('../func');

/**
 * 
 */
module.exports.BindData = function (req, urlQuery, callback) {

    var self = this;
    var err = null;

    var sourceKey = urlQuery.source_key;
    var dataSourceDescription = importedDataPreparation.DataSourceDescriptionWithPKey(sourceKey);

    if (dataSourceDescription == null || typeof dataSourceDescription === 'undefined') {
        callback(new Error("No data source with that source pkey " + sourceKey), null);
        return;
    }

    var team = importedDataPreparation.TeamDescription(dataSourceDescription.team_id);
    var urlQuery_forSwitchingViews = '';
    var filterObj = func.filterObjFromQueryParams(urlQuery);
    var isFilterActive = Object.keys(filterObj).length != 0;
    var searchCol = urlQuery.searchCol;
    var searchQ = urlQuery.searchQ;
    /*
     * Run chain of function to collect necessary data.
     */
    raw_source_documents.Model.findOne({primaryKey: sourceKey}, function (err, sourceDoc) {
        /*
         * Run callback function to finish action.
         */
        callback(err, {
            env: process.env,
            user: req.user,
            metaData: dataSourceDescription,
            array_source_key: sourceKey,
            team: team,
            brandColor: dataSourceDescription.brandColor,
            sourceDoc: sourceDoc,
            view_visibility: dataSourceDescription.fe_views ? dataSourceDescription.fe_views : {},
            routePath_base: '/array/' + sourceKey + '/scatterplot',
            filterObj: filterObj,
            isFilterActive: isFilterActive,
            urlQuery_forSwitchingViews: urlQuery_forSwitchingViews || '',
            searchCol: searchCol || '',
            searchQ: searchQ || '',
            multiselectableFilterFields: dataSourceDescription.fe_filters_fieldsMultiSelectable,
            pieData: [{
                    title : 'First one',
                    data : [{"value":397,"label":"NASA 2"},{"value":17,"label":"Intelsat"},{"value":12,"label":"DOE"},{"value":7,"label":"DOD"},{"value":5,"label":"RAYTHEON"},{"value":1,"label":"OSC"}]
                }, {
                    title : 'Second one',
                    data : [{"value":97166,"label":"Male"},{"value":15570,"label":"Female"}]
                }
            ]
        });
    });
};