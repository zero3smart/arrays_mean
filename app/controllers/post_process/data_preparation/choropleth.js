var winston = require('winston');
var fs = require('fs');
var Batch = require('batch');
//
var importedDataPreparation = require('../../../datasources/utils/imported_data_preparation');
var import_datatypes = require('../../../datasources/utils/import_datatypes');
var raw_source_documents = require('../../../models/raw_source_documents');
var processed_row_objects = require('../../../models/processed_row_objects');
var config = require('../config');
var func = require('../func');

// Prepare country geo data cache
var __countries_geo_json_str = fs.readFileSync(__dirname + '/../../../public/data/world.geo.json/countries.geo.json', 'utf8');
var __countries_geo_json = JSON.parse(__countries_geo_json_str);
var cache_countryGeometryByLowerCasedCountryName = {};
var numCountries = __countries_geo_json.features.length;
for (var i = 0; i < numCountries; i++) {
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

module.exports.BindData = function (req, urlQuery, callback) {
    var self = this;
    // urlQuery keys:
    // source_key
    // mapBy
    // searchQ
    // searchCol
    // Other filters
    var source_pKey = urlQuery.source_key;

    importedDataPreparation.DataSourceDescriptionWithPKey(source_pKey)
    .then(function(dataSourceDescription) { 
        if (dataSourceDescription == null || typeof dataSourceDescription === 'undefined') {
            callback(new Error("No data source with that source pkey " + source_pKey), null);

            return;
        }

        // var team = importedDataPreparation.TeamDescription(dataSourceDescription.team_id);

        if (typeof dataSourceDescription.fe_views !== 'undefined' && dataSourceDescription.fe_views.views != null && typeof dataSourceDescription.fe_views.views.choropleth === 'undefined') {
            callback(new Error('View doesn\'t exist for dataset. UID? urlQuery: ' + JSON.stringify(urlQuery, null, '\t')), null);

            return;
        }
       
        var processedRowObjects_mongooseContext = processed_row_objects.Lazy_Shared_ProcessedRowObject_MongooseContext(source_pKey);
        var processedRowObjects_mongooseModel = processedRowObjects_mongooseContext.Model;
        //
        var mapBy = urlQuery.mapBy; // the human readable col name - real col name derived below
        var defaultMapByColumnName_humanReadable = dataSourceDescription.fe_views.view.choropleth.defaultMapByColumnName_humanReadable;
        //
        var routePath_base = "/array/" + source_pKey + "/choropleth";
        var sourceDocURL = dataSourceDescription.urls ? dataSourceDescription.urls.length > 0 ? dataSourceDescription.urls[0] : null : null;
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
        var sourceDoc, sampleDoc, uniqueFieldValuesByFieldName, mapFeatures = [], highestValue = 0;

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
                for (var columnName in _uniqueFieldValuesByFieldName) {
                    if (_uniqueFieldValuesByFieldName.hasOwnProperty(columnName)) {
                        var raw_rowObjects_coercionSchema = dataSourceDescription.raw_rowObjects_coercionScheme;
                        if (raw_rowObjects_coercionSchema && raw_rowObjects_coercionSchema[columnName]) {
                            var row = [];
                            _uniqueFieldValuesByFieldName[columnName].forEach(function (rowValue) {
                                row.push(import_datatypes.OriginalValue(raw_rowObjects_coercionSchema[columnName], rowValue));
                            });
                            row.sort();
                            uniqueFieldValuesByFieldName[columnName] = row;
                        } else {
                            uniqueFieldValuesByFieldName[columnName] = _uniqueFieldValuesByFieldName[columnName];
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
                    }
                }
                done();
            });
        });

        // Obtain grouped results
        batch.push(function (done) {
            var mapBy_realColumnName = importedDataPreparation.RealColumnNameFromHumanReadableColumnName(mapBy ? mapBy : defaultMapByColumnName_humanReadable,
                dataSourceDescription);
            //
            var aggregationOperators = [];
            if (isSearchActive) {
                var _orErrDesc = func.activeSearch_matchOp_orErrDescription(dataSourceDescription, searchCol, searchQ);
                if (_orErrDesc.err) return done(_orErrDesc.err);

                aggregationOperators = aggregationOperators.concat(_orErrDesc.matchOps);
            }
            if (isFilterActive) { // rules out undefined filterCol
                var _orErrDesc = func.activeFilter_matchOp_orErrDescription_fromMultiFilter(dataSourceDescription, filterObj);
                if (_orErrDesc.err) return done(_orErrDesc.err);

                aggregationOperators = aggregationOperators.concat(_orErrDesc.matchOps);
            }
            aggregationOperators = aggregationOperators.concat(
                [
                    { // unique/grouping and summing stage
                        $group: {
                            _id: "$" + "rowParams." + mapBy_realColumnName,
                            total: {$sum: 1} // the count
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
            var doneFn = function (err, _groupedResults) {
                if (err) return done(err);

                if (_groupedResults == undefined || _groupedResults == null) _groupedResults = [];
                _groupedResults.forEach(function (el, i, arr) {
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
                done();
            };
            processedRowObjects_mongooseModel.aggregate(aggregationOperators).allowDiskUse(true)/* or we will hit mem limit on some pages*/.exec(doneFn);
        });

        batch.end(function (err) {
            if (err) return callback(err);

            //
            var data =
            {
                env: process.env,
                
                user: req.user,

                arrayTitle: dataSourceDescription.title,
                array_source_key: source_pKey,
                team: null,
                brandColor: dataSourceDescription.brandColor,
                sourceDoc: sourceDoc,
                sourceDocURL: sourceDocURL,
                view_visibility: dataSourceDescription.fe_views.views ? dataSourceDescription.fe_views.views : {},
                //
                highestValue: highestValue,
                featureCollection: {
                    type: "FeatureCollection",
                    features: mapFeatures
                },
                mapBy: mapBy,
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
                defaultMapByColumnName_humanReadable: defaultMapByColumnName_humanReadable,
                colNames_orderedForMapByDropdown: importedDataPreparation.HumanReadableFEVisibleColumnNamesWithSampleRowObject_orderedForChoroplethMapByDropdown(sampleDoc, dataSourceDescription),
                colNames_orderedForSortByDropdown: importedDataPreparation.HumanReadableFEVisibleColumnNamesWithSampleRowObject_orderedForSortByDropdown(sampleDoc, dataSourceDescription),
                //
                routePath_base: routePath_base,
                // multiselectable filter fields
                multiselectableFilterFields: dataSourceDescription.fe_filters.fieldsMultiSelectable
            };
            callback(err, data);
        });



    })

    
    
};