
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

        // console.log(JSON.stringify(sampleDoc));

        if (err) {
            callback(err, null);

            return;
        }
        var limitToNTopValues = 50;
        // var feVisible_filter_keys = imported_data_preparation.RowParamKeysFromSampleRowObject_whichAreAvailableAsFilters(sampleDoc, dataSourceDescription);

        var filterKeys = Object.keys(sampleDoc.rowParams);

        if (typeof dataSourceDescription.fe_excludeFields != 'undefined' && Array.isArray(dataSourceDescription.fe_excludeFields) && dataSourceDescription.fe_excludeFields.length > 0) {
            for (var i = 0 ; i < dataSourceDescription.fe_excludeFields.length; i++) {
                var index = filterKeys.indexOf(dataSourceDescription.fe_excludeFields[i]);
                if (filterKeys[index] == dataSourceDescription.fe_excludeFields[i]) {
                    filterKeys.splice(index,1);
                }
            }
        }

    
        // var feVisible_filter_keys_length = feVisible_filter_keys.length;
        var uniqueFieldValuesByFieldName = {};

        for (var i = 0; i < filterKeys.length ; i++) {
            var key = filterKeys[i];
            uniqueFieldValuesByFieldName[key] = [];
        }



        async.each(filterKeys, function (key, cb) {
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
                
                valuesRaw = results.map(function (el) {
                    return el._id;
                });
                

                // flatten array of arrays (for nested tables)
                var values = [].concat.apply([], valuesRaw).filter(function (elem, index, self) {
                    return elem != '';
                }).splice(0, limitToNTopValues);
                values.sort();
  
                uniqueFieldValuesByFieldName[key] = values;
                cb();
            });
        }, function (err) {

            if (err) callback(err);

           

            var persistableDoc =
            {
                srcDocPKey: dataSourceRevision_pKey,
                limitedUniqValsByColName: uniqueFieldValuesByFieldName
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
};
