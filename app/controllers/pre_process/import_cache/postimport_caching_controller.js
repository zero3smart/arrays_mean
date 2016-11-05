//
//
// 
var async = require("async");
var fs = require('fs');
var parse = require('csv-parse');
var winston = require('winston');

var imported_data_preparation = require('../../../datasources/utils/imported_data_preparation')
var processed_row_objects = require('../../../models/processed_row_objects');
var raw_source_documents = require('../../../models/raw_source_documents');
var cache_keywords_controller = require('./cache_keywords_controller');

//
//
module.exports.GeneratePostImportCaches = function (dataSourceDescriptions,fn) {
    var i = 1;


    async.eachSeries(dataSourceDescriptions, function (dataSourceDescription, callback) {
        _dataSourcePostImportCachingFunction(i, dataSourceDescription, callback);
        i++;
    }, function (err) {
        if (err) {
            winston.info("❌  Error encountered during post-import caching:", err);
            process.exit(1); // error code
        } else {
            winston.info("✅  Post-import caching done.");
            if (!fn) {
                process.exit(0); // all good
            }

            return fn();


           
        }
    });
};
//
var _dataSourcePostImportCachingFunction = function (indexInList, dataSourceDescription, callback) {
    var dataSource_title = dataSourceDescription.title;
    var fe_visible = dataSourceDescription.fe_visible;
    // var isCustom = dataSourceDescription.isCustom;
    if (typeof fe_visible !== 'undefined' && fe_visible != null && fe_visible === false) {
        winston.warn("⚠️  The data source \"" + dataSource_title + "\" had fe_visible=false, so not going to generate its unique filter value cache.");
        return callback(null);
    }
    winston.info("🔁  " + indexInList + ": Generated post-import caches for \"" + dataSource_title + "\"");


    _generateUniqueFilterValueCacheCollection(dataSourceDescription, function (err) {
        if (err) {
            winston.error("❌  Error encountered while post-processing \"" + dataSource_title + "\".");
            return callback(err);
        }
        // Cachcing Keyword for the word cloud
        cache_keywords_controller.cacheKeywords_fromDataSourceDescription(dataSourceDescription, callback);
    });


};

var _generateUniqueFilterValueCacheCollection = function (dataSourceDescription, callback) {


    var dataSource_uid = dataSourceDescription.uid;
    var dataSource_title = dataSourceDescription.title;
    var dataSource_importRevision = dataSourceDescription.importRevision;
    var dataSourceRevision_pKey = raw_source_documents.NewCustomPrimaryKeyStringWithComponents(dataSource_uid, dataSource_importRevision);
    //
    var processedRowObjects_mongooseContext = processed_row_objects.Lazy_Shared_ProcessedRowObject_MongooseContext(dataSourceRevision_pKey);
    var processedRowObjects_mongooseModel = processedRowObjects_mongooseContext.Model;
    //
    processedRowObjects_mongooseModel.findOne({}, function (err, sampleDoc) {
        if (err) {
            callback(err, null);

            return;
        }
        var limitToNTopValues = 50;
        var feVisible_filter_keys = imported_data_preparation.RowParamKeysFromSampleRowObject_whichAreAvailableAsFilters(sampleDoc, dataSourceDescription);
        var feVisible_filter_keys_length = feVisible_filter_keys.length;
        var uniqueFieldValuesByFieldName = {};
        for (var i = 0; i < feVisible_filter_keys_length; i++) {
            var key = feVisible_filter_keys[i];
            uniqueFieldValuesByFieldName[key] = [];
        }

        async.each(feVisible_filter_keys, function (key, cb) {
            // Commented out the count section for the comma-separated as individual filters.
            var uniqueStage = {$group: {_id: {}, count: {$sum: 1}}};
            uniqueStage["$group"]["_id"] = "$" + "rowParams." + key;

            processedRowObjects_mongooseModel.aggregate([

                {$unwind: "$" + "rowParams." + key}, // requires MongoDB 3.2, otherwise throws an error if non-array
                uniqueStage,
                {$sort: {count: -1}},
                //{ $limit : limitToNTopValues }
            ]).allowDiskUse(true).exec(function (err, results) {
                if (err) {
                    cb(err);

                    return;
                }
                if (results == undefined || results == null || results.length == 0) {
                    callback(new Error('Unexpectedly empty unique field value aggregation'));

                    return;
                }
                var valuesRaw;
                if (dataSourceDescription.fe_filters.fieldsCommaSeparatedAsIndividual && dataSourceDescription.fe_filters.fieldsCommaSeparatedAsIndividual.indexOf(key) !== -1) {
                    var raw = {}
                    results.forEach(function (el) {
                        if (Array.isArray(el._id) || typeof el._id === 'string') {
                            var _newId;
                            if (Array.isArray(el._id)) {
                                _newId = []
                                el._id.forEach(function (_id) {
                                    if (typeof _id === 'string') _newId.concat(_id.split(/[\s]*[,]+[\s]*/));
                                });
                            } else {
                                _newId = el._id.split(/[\s]*[,]+[\s]*/);
                            }

                            _newId.filter(function (elem, index, self) {
                                return elem != '' && index === _newId.indexOf(elem);
                            }).forEach(function (_newIdEl) {
                                raw[_newIdEl] = raw[_newIdEl] !== undefined ? raw[_newIdEl] + el.count : el.count;
                            });
                        } else {
                            raw[el._id] = el.count;
                        }
                    });

                    // Sort raw by values
                    valuesRaw = [];
                    for (var id in raw) {
                        valuesRaw.push({id: id, count: raw[id]});
                    }
                    valuesRaw.sort(function (a, b) {
                        return a.count < b.count;
                    });
                    valuesRaw = valuesRaw.map(function (el) {
                        return el.id;
                    });
                } else {
                    valuesRaw = results.map(function (el) {
                        return el._id;
                    });
                }

                // flatten array of arrays (for nested tables)
                var values = [].concat.apply([], valuesRaw).filter(function (elem, index, self) {
                    return elem != '';
                }).splice(0, limitToNTopValues);
                //
                // remove illegal values
                var illegalValues = []; // default val

                if (dataSourceDescription.fe_filters.valuesToExcludeByOriginalKey) {

                    if (dataSourceDescription.fe_filters.valuesToExcludeByOriginalKey._all) {

                        illegalValues = illegalValues.concat(dataSourceDescription.fe_filters.valuesToExcludeByOriginalKey._all);
                    }
                    var illegalValuesForThisKey = dataSourceDescription.fe_filters.valuesToExcludeByOriginalKey[key];
                    if (illegalValuesForThisKey) {
                        illegalValues = illegalValues.concat(illegalValuesForThisKey);
                    }
                }
                //
                var illegalValues_length = illegalValues.length;
                for (var i = 0; i < illegalValues_length; i++) {
                    var illegalVal = illegalValues[i];
                    var idxOfIllegalVal = values.indexOf(illegalVal);
                    if (idxOfIllegalVal !== -1) {
                        values.splice(idxOfIllegalVal, 1);
                    }
                }
                //
                values.sort();
                //
                // Note here we use the human-readable key. We decode it back to the original key at query-time
                delete uniqueFieldValuesByFieldName[key]; // so no stale values persist in hash
                var finalizedStorageKey = dataSourceDescription.fe_displayTitleOverrides[key] || key;
                uniqueFieldValuesByFieldName[finalizedStorageKey] = values;
                cb();
            });
        }, function (err) {
            if (err) {
                callback(err, null);

                return;
            }
            // Override values
            var oneToOneOverrideWithValuesByTitleByFieldName = dataSourceDescription.fe_filters.oneToOneOverrideWithValuesByTitleByFieldName || {};
            var fieldNamesToOverride = Object.keys(oneToOneOverrideWithValuesByTitleByFieldName);
            async.each(fieldNamesToOverride, function (fieldName, cb) {
                var oneToOneOverrideWithValuesByTitle = oneToOneOverrideWithValuesByTitleByFieldName[fieldName];
                var titles = Object.keys(oneToOneOverrideWithValuesByTitle);
                uniqueFieldValuesByFieldName[fieldName] = titles;
                cb();
            }, function (err) {
                if (err) {
                    callback(err, null);

                    return;
                }
                var persistableDoc =
                {
                    srcDocPKey: dataSourceRevision_pKey,
                    limitedUniqValsByHumanReadableColName: uniqueFieldValuesByFieldName
                };
                var cached_values = require('../../../models/cached_values');
                cached_values.findOneAndUpdate({srcDocPKey: dataSourceRevision_pKey}, persistableDoc, {
                    upsert: true,
                    new: true
                }, function (err, doc) {
                    if (err) {
                        return callback(err, null);
                    }
                    winston.info("✅  Inserted cachedUniqValsByKey for \"" + dataSource_title + "\".");
                    callback(null, null);
                });
            });
        });
    });
};
