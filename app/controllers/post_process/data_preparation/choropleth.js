var winston = require('winston');
var fs = require('fs');
//
var importedDataPreparation = require('../../../datasources/utils/imported_data_preparation');
var config = new require('../config')();
var functions = new require('../functions')();
//
// Prepare country geo data cache
var __countries_geo_json_str = fs.readFileSync(__dirname + '/../../../public/data/countries.geo.json', 'utf8');
var __countries_geo_json = JSON.parse(__countries_geo_json_str);
var cache_countryGeometryByLowerCasedCountryName = {};
var numCountries = __countries_geo_json.features.length;
for (var i = 0 ; i < numCountries ; i++) {
    var countryFeature = __countries_geo_json.features[i];
    var countryName = countryFeature.properties.name;
    var geometry = countryFeature.geometry;
    cache_countryGeometryByLowerCasedCountryName[countryName.toLowerCase()] = geometry;
    // console.log(countryName + ": ", geometry);
}
winston.info("💬  Cached " + Object.keys(cache_countryGeometryByLowerCasedCountryName).length + " geometries by country name.");
// console.log("cache_countryGeometryByLowerCasedCountryName " , cache_countryGeometryByLowerCasedCountryName);
__countries_geo_json_str = undefined; // free
__countries_geo_json = undefined; // free

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
    // mapBy
    // filterJSON
    // searchQ
    // searchCol
    var source_pKey = urlQuery.source_key;
    var dataSourceDescription = importedDataPreparation.DataSourceDescriptionWithPKey(source_pKey, self.context.raw_source_documents_controller);
    if (dataSourceDescription == null || typeof dataSourceDescription === 'undefined') {
        callback(new Error("No data source with that source pkey " + source_pKey), null);

        return;
    }
    if (typeof dataSourceDescription.fe_views !== 'undefined' && dataSourceDescription.fe_views.choropleth != null && dataSourceDescription.fe_views.choropleth === false) {
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
    var mapBy = urlQuery.mapBy; // the human readable col name - real col name derived below
    var defaultMapByColumnName_humanReadable = dataSourceDescription.fe_choropleth_defaultMapByColumnName_humanReadable;
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
        var mapBy_realColumnName = importedDataPreparation.RealColumnNameFromHumanReadableColumnName(mapBy ? mapBy : defaultMapByColumnName_humanReadable,
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
        aggregationOperators = aggregationOperators.concat(
            [
                { // unique/grouping and summing stage
                    $group: {
                        _id: "$" + "rowParams." + mapBy_realColumnName,
                        total: { $sum: 1 } // the count
                    }
                },
                { // reformat
                    $project: {
                        _id: 0,
                        name: "$_id",
                        total: 1
                    }
                }
            ]);
        //
        var doneFn = function(err, groupedResults)
        {
            if (err) {
                callback(err, null);

                return;
            }
            if (groupedResults == undefined || groupedResults == null) {
                groupedResults = [];
            }
            var mapFeatures = [];
            var highestValue = 0;
            groupedResults.forEach(function(el, i, arr)
            {
                var countryName = el.name;
                if (countryName == null) {
                    return; // skip
                }
                var countAtCountry = el.total;
                if (countAtCountry > highestValue) {
                    highestValue = countAtCountry;
                }
                var countAtCountry_str = "" + countAtCountry;
                var geometryForCountry = cache_countryGeometryByLowerCasedCountryName[countryName.toLowerCase()];
                if (typeof geometryForCountry === 'undefined') {
                    winston.warn("⚠️  No known geometry for country named \"" + countryName + "\"");

                    return;
                }
                mapFeatures.push({
                    type: "Feature",
                    id: "" + i,
                    properties: {
                        name: countryName,
                        total: parseInt(countAtCountry_str)
                    },
                    geometry: geometryForCountry
                });
            });
            // console.log("mapFeatures " ,mapFeatures)
            _prepareDataAndCallBack(sourceDoc, sampleDoc, uniqueFieldValuesByFieldName, mapFeatures, highestValue);
        };
        processedRowObjects_mongooseModel.aggregate(aggregationOperators).allowDiskUse(true)/* or we will hit mem limit on some pages*/.exec(doneFn);
    }
    function _prepareDataAndCallBack(sourceDoc, sampleDoc, uniqueFieldValuesByFieldName, mapFeatures, highestValue)
    {
        var err = null;
        var routePath_base              = "/array/" + source_pKey + "/choropleth";
        var routePath_withoutFilter     = routePath_base;
        var routePath_withoutMapBy      = routePath_base;
        var urlQuery_forSwitchingViews  = "";
        if (mapBy !== undefined && mapBy != null && mapBy !== "") {
            var appendQuery = "mapBy=" + mapBy;
            routePath_withoutFilter     = functions._routePathByAppendingQueryStringToVariationOfBase(routePath_withoutFilter,    appendQuery, routePath_base);
        }
        if (isFilterActive) {
            var appendQuery = "filterJSON=" + filterJSON_uriEncodedVals;
            routePath_withoutMapBy      = functions._routePathByAppendingQueryStringToVariationOfBase(routePath_withoutMapBy,     appendQuery, routePath_base);
            urlQuery_forSwitchingViews  = functions._urlQueryByAppendingQueryStringToExistingQueryString(urlQuery_forSwitchingViews, appendQuery);
        }
        if (isSearchActive) {
            var appendQuery = "searchCol=" + searchCol + "&" + "searchQ=" + searchQ;
            routePath_withoutFilter     = functions._routePathByAppendingQueryStringToVariationOfBase(routePath_withoutFilter,    appendQuery, routePath_base);
            routePath_withoutMapBy      = functions._routePathByAppendingQueryStringToVariationOfBase(routePath_withoutMapBy,     appendQuery, routePath_base);
            urlQuery_forSwitchingViews  = functions._urlQueryByAppendingQueryStringToExistingQueryString(urlQuery_forSwitchingViews, appendQuery);
        }
        //
        var sourceDocURL = dataSourceDescription.urls ? dataSourceDescription.urls.length > 0 ? dataSourceDescription.urls[0] : null : null;
        //
        var truesByFilterValueByFilterColumnName_forWhichNotToOutputColumnNameInPill = functions._new_truesByFilterValueByFilterColumnName_forWhichNotToOutputColumnNameInPill(dataSourceDescription);
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
            highestValue: highestValue,
            featureCollection: {
                type: "FeatureCollection",
                features: mapFeatures
            },
            mapBy: mapBy,
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
            defaultMapByColumnName_humanReadable: defaultMapByColumnName_humanReadable,
            colNames_orderedForMapByDropdown: importedDataPreparation.HumanReadableFEVisibleColumnNamesWithSampleRowObject_orderedForChoroplethMapByDropdown(sampleDoc, dataSourceDescription),
            colNames_orderedForSortByDropdown: importedDataPreparation.HumanReadableFEVisibleColumnNamesWithSampleRowObject_orderedForSortByDropdown(sampleDoc, dataSourceDescription),
            //
            routePath_base: routePath_base,
            routePath_withoutFilter: routePath_withoutFilter,
            routePath_withoutMapBy: routePath_withoutMapBy,
            //
            urlQuery_forSwitchingViews: urlQuery_forSwitchingViews
        };
        callback(err, data);
    }
};

module.exports = constructor;