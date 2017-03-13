var winston = require('winston');
var fs = require('fs');
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

// Prepare country geo data cache
var __countries_geo_json_str = fs.readFileSync(__dirname + '/../../../data/countries.geo.json', 'utf8');
var __countries_geo_json = JSON.parse(__countries_geo_json_str);
var cache_countryGeometryByCountryId = {};
var __countryNameToIdDict_str = fs.readFileSync(__dirname + '/../../../data/countryNameToId.json', 'utf8');
var cache_countryNameToIdDict = JSON.parse(__countryNameToIdDict_str);
var numCountries = __countries_geo_json.features.length;
for (var i = 0; i < numCountries; i++) {
    var countryFeature = __countries_geo_json.features[i];
    var countryId = countryFeature.id;
    var geometry = countryFeature.geometry;
    cache_countryGeometryByCountryId[countryId] = geometry;
}
// winston.info("💬  Cached " + Object.keys(cache_countryGeometryByCountryId).length + " geometries by country name.");

__countries_geo_json_str = undefined; // free
__countries_geo_json = undefined; // free

module.exports.BindData = function (req, urlQuery, callback) {
    var self = this;
    // urlQuery keys:
    // source_key
    // mapBy
    // aggregateby
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
            if (typeof dataSourceDescription.fe_views !== 'undefined' && dataSourceDescription.fe_views.views != null && typeof dataSourceDescription.fe_views.views.map === 'undefined') {
                callback(new Error('View doesn\'t exist for dataset. UID? urlQuery: ' + JSON.stringify(urlQuery, null, '\t')), null);

                return;
            }

            var processedRowObjects_mongooseContext = processed_row_objects.Lazy_Shared_ProcessedRowObject_MongooseContext(dataSourceDescription._id);
            var processedRowObjects_mongooseModel = processedRowObjects_mongooseContext.Model;
            //
            var mapBy = urlQuery.mapBy; // the human readable col name - real col name derived below
            var defaultMapByColumnName_humanReadable = dataSourceDescription.fe_displayTitleOverrides[dataSourceDescription.fe_views.views.map.defaultMapByColumnName] ||
            dataSourceDescription.fe_views.views.map.defaultMapByColumnName;
            //
            var galleryViewEnabled;
            if (dataSourceDescription.fe_views.views.gallery != undefined) {
                if (dataSourceDescription.fe_views.views.gallery.visible != undefined) {
                    galleryViewEnabled = dataSourceDescription.fe_views.views.gallery.visible;
                } else {
                    galleryViewEnabled = false;
                }
            } else {
                galleryViewEnabled = false;
            }
            //
            var routePath_base = "/" + source_pKey + "/map";
            var sourceDocURL = dataSourceDescription.urls ? dataSourceDescription.urls.length > 0 ? dataSourceDescription.urls[0] : null : null;
            var brandColor = dataSourceDescription.brandColor;
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


           
            var aggregateBy = urlQuery.aggregateBy? urlQuery.aggregateBy : dataSourceDescription.fe_views.views.map.defaultAggregateByColumnName;
            var defaultAggregateByColumnName_humanReadable = dataSourceDescription.fe_displayTitleOverrides[dataSourceDescription.fe_views.views.map.defaultAggregateByColumnName] ||
            dataSourceDescription.fe_views.views.map.defaultAggregateByColumnName ;

            var aggregateBy_realColumnName = aggregateBy? importedDataPreparation.RealColumnNameFromHumanReadableColumnName(aggregateBy,dataSourceDescription) :
            (typeof dataSourceDescription.fe_views.views.map.defaultAggregateByColumnName  == 'undefined') ?importedDataPreparation.RealColumnNameFromHumanReadableColumnName(defaultAggregateByColumnName_humanReadable,dataSourceDescription) :
            dataSourceDescription.fe_views.views.map.defaultAggregateByColumnName;


            var sourceDoc, sampleDoc, uniqueFieldValuesByFieldName, mapFeatures = [], highestValue = 0, coordFeatures = [], coordMinMax = {min: 0, max: 0}, coordRadiusValue, coordTitle;
            var latField = dataSourceDescription.fe_views.views.map.latitudeField,
                lngField = dataSourceDescription.fe_views.views.map.longitudeField;

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

            if (dataSourceDescription.fe_views.views.map.plotCoordinates) {

                batch.push(function(done) {
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

                    var doneFn = function(err, _coordDocs) {
                        if (err) return done(err);

                        // coordRadiusValue = dataSourceDescription.fe_views.views.map.radiusBy;
                        coordRadiusValue = aggregateBy;
                        var coordValue;

                        coordTitle = dataSourceDescription.fe_views.views.map.coordTitle;

                        if (_coordDocs == undefined || _coordDocs == null) _coordDocs = [];
                        if (_coordDocs.length > 0 && coordRadiusValue != undefined) {
                            coordMinMax.max = parseInt(_coordDocs[0].rowParams[coordRadiusValue]);
                            coordMinMax.min = parseInt(_coordDocs[0].rowParams[coordRadiusValue]);
                        }

                        _coordDocs.forEach(function (el, i, arr) {
                            if (coordRadiusValue != undefined) {

                                coordValue = parseInt(el.rowParams[coordRadiusValue]);
                                if(coordValue > coordMinMax.max) {
                                    coordMinMax.max = coordValue;
                                } else if (coordValue < coordMinMax.min) {
                                    coordMinMax.min = coordValue;
                                }

                                coordFeatures.push({
                                    type: "Feature",
                                    geometry: {
                                        type: "Point",
                                        coordinates: [el.rowParams[lngField], el.rowParams[latField]]
                                    },
                                    properties: {
                                        name: el.rowParams[coordTitle],
                                        total: coordValue,
                                        id: el._id
                                    }
                                });

                            } else {

                                coordFeatures.push({
                                    type: "Feature",
                                    geometry: {
                                        type: "Point",
                                        coordinates: [el.rowParams[lngField], el.rowParams[latField]]
                                    },
                                    properties: {
                                        name: el.rowParams[coordTitle],
                                        id: el._id
                                    }
                                });

                            }

                        });
                        done();
                    }
                    // Potentially change to cursor function to optimize
                    if (aggregationOperators.length > 0) {
                        processedRowObjects_mongooseModel.aggregate(aggregationOperators).allowDiskUse(true)/* or we will hit mem limit on some pages*/.exec(doneFn);
                    } else {
                        processedRowObjects_mongooseModel.find({}).exec(doneFn);
                    }
                });
            } else {
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

                    var totalQuery = {$sum: 1};


                    if (aggregateBy_realColumnName && aggregateBy_realColumnName != config.aggregateByDefaultColumnName) {
                        totalQuery["$sum"] = "$rowParams." + aggregateBy_realColumnName
                    }

                    aggregationOperators = aggregationOperators.concat(
                        [
                            { // unique/grouping and summing stage
                                $group: {
                                    _id: "$" + "rowParams." + mapBy_realColumnName,
                                    total: totalQuery
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
                            var formattedCountryName = countryName.toString().toLowerCase().trim().replace(/ /g,"_");
                            var countryId = cache_countryNameToIdDict.countries[formattedCountryName];
                            var geometryForCountry = cache_countryGeometryByCountryId[countryId];
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
            }
            

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

                //


                var data =
                {
                    env: process.env,

                    user: user,
          

                    arrayTitle: dataSourceDescription.title,
                    array_source_key: source_pKey,
                    team: dataSourceDescription._team ? dataSourceDescription._team : null,
                    brandColor: dataSourceDescription.brandColor,
                    brandWhiteText: func.useLightBrandText(dataSourceDescription.brandColor),
                    brandContentColor: func.calcContentColor(dataSourceDescription.brandColor),
                    sourceDoc: sourceDoc,
                    sourceDocURL: sourceDocURL,
                    brandColor: brandColor,
                    view_visibility: dataSourceDescription.fe_views.views ? dataSourceDescription.fe_views.views : {},
                    view_description: dataSourceDescription.fe_views.views.map.description ? dataSourceDescription.fe_views.views.map.description : "",
                    //
                    galleryViewEnabled: galleryViewEnabled,
                    highestValue: highestValue,
                    featureCollection: {
                        type: "FeatureCollection",
                        features: mapFeatures
                    },
                    isCoordMap: dataSourceDescription.fe_views.views.map.plotCoordinates,
                    coordCol: coordTitle,
                    coordCollection: {
                        type: "FeatureCollection",
                        features: coordFeatures
                    },
                    coordMinMax: coordMinMax,
                    applyCoordRadius: coordRadiusValue == undefined ? false : true,
                    coordColor: dataSourceDescription.fe_views.views.map.coordColor ? dataSourceDescription.fe_views.views.map.coordColor : dataSourceDescription.brandColor,
                    mapBy: mapBy,
                    displayTitleOverrides:  _.cloneDeep(dataSourceDescription.fe_displayTitleOverrides),
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
                    colNames_orderedForMapByDropdown: importedDataPreparation.HumanReadableFEVisibleColumnNamesWithSampleRowObject_orderedForDropdown(sampleDoc, dataSourceDescription, 'map', 'MapBy'),
                    colNames_orderedForSortByDropdown: importedDataPreparation.HumanReadableFEVisibleColumnNamesWithSampleRowObject_orderedForSortByDropdown(sampleDoc, dataSourceDescription),
                    //
                    routePath_base: routePath_base,
                    // multiselectable filter fields
                    multiselectableFilterFields: dataSourceDescription.fe_filters.fieldsMultiSelectable,

                    colNames_orderedForAggregateByDropdown: importedDataPreparation.HumanReadableFEVisibleColumnNamesWithSampleRowObject_orderedForDropdown(sampleDoc, dataSourceDescription, 'map', 'AggregateBy', 'ToInteger'),
                    defaultAggregateByColumnName_humanReadable: defaultAggregateByColumnName_humanReadable,
                    aggregateBy: aggregateBy,
                    defaultView: config.formatDefaultView(dataSourceDescription.fe_views.default_view)

                };
                callback(err, data);
            });


        })


};