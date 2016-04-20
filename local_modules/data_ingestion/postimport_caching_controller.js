//
//
// 
var async = require("async");
var fs = require('fs');
var parse = require('csv-parse');
var winston = require('winston');

var imported_data_preparation = require('./imported_data_preparation')
//
//
//
////////////////////////////////////////////////////////////////////////////////

var constructor = function(options, context)
{
    var self = this;
    self.options = options;
    self.context = context;
    
    self._init();
    
    return self;
}
module.exports = constructor;
constructor.prototype._init = function()
{
    var self = this;
    // winston.info("post import caching controller is up")
};
//
//
constructor.prototype.GeneratePostImportCaches = function(dataSourceDescriptions)
{
    var self = this;
    var i = 1;
    async.eachSeries(dataSourceDescriptions, function(dataSourceDescription, callback)
    { 
        self._dataSourcePostImportCachingFunction(i, dataSourceDescription, callback);
        i++;
    }, function(err) 
    {
        if (err) {
            winston.info("❌  Error encountered during post-import caching:", err);
            process.exit(1); // error code
        } else {
            winston.info("✅  Post-import caching done.");
            process.exit(0); // all good
        }
    });
};
//
constructor.prototype._dataSourcePostImportCachingFunction = function(indexInList, dataSourceDescription, callback)
{
    var self = this;
    var dataSource_title = dataSourceDescription.title;
    var fe_visible = dataSourceDescription.fe_visible;
    if (typeof fe_visible !== 'undefined' && fe_visible != null && fe_visible === false) {
        winston.warn("⚠️  The data source \"" + dataSource_title + "\" had fe_visible=false, so not going to generate its unique filter value cache.");
        callback(null);
        
        return;
    }
    winston.info("🔁  " + indexInList + ": Generated post-import caches for \"" + dataSource_title + "\"");
    self.generateUniqueFilterValueCacheCollection(dataSourceDescription, function(err) 
    {
        if (err) {
            winston.error("❌  Error encountered while post-processing \"" + dataSource_title + "\".");
            callback(err);

            return;
        }
        callback(null);
    });
}
//
constructor.prototype.generateUniqueFilterValueCacheCollection = function(dataSourceDescription, callback)
{
    var self = this;
    //
    var dataSource_uid = dataSourceDescription.uid;
    var dataSource_title = dataSourceDescription.title;
    var dataSource_importRevision = dataSourceDescription.importRevision;    
    var dataSourceRevision_pKey = self.context.raw_source_documents_controller.NewCustomPrimaryKeyStringWithComponents(dataSource_uid, dataSource_importRevision);
    //
    var processedRowObjects_mongooseContext = self.context.processed_row_objects_controller.Lazy_Shared_ProcessedRowObject_MongooseContext(dataSourceRevision_pKey);
    var processedRowObjects_mongooseModel = processedRowObjects_mongooseContext.Model;
    //
    processedRowObjects_mongooseModel.findOne({}, function(err, sampleDoc)
    {
        if (err) {
            callback(err, null);
        
            return;
        }        
        var limitToNTopValues = 50;
        var feVisible_filter_keys = imported_data_preparation.RowParamKeysFromSampleRowObject_whichAreAvailableAsFilters(sampleDoc, dataSourceDescription);
        var feVisible_filter_keys_length = feVisible_filter_keys.length;
        var uniqueFieldValuesByFieldName = {};
        for (var i = 0 ; i < feVisible_filter_keys_length ; i++) {
            var key = feVisible_filter_keys[i];
            uniqueFieldValuesByFieldName[key] = [];
        }
        async.each(feVisible_filter_keys, function(key, cb) 
        {            
            var uniqueStage = { $group : { _id: {}, count: { $sum: 1 } } };
            uniqueStage["$group"]["_id"] = "$" + "rowParams." + key;
            //
            processedRowObjects_mongooseModel.aggregate([
                uniqueStage,
                { $sort : { count : -1 } },
                { $limit : limitToNTopValues }                
            ]).allowDiskUse(true).exec(function(err, results)
            {
                if (err) {
                    cb(err);

                    return;
                }
                if (results == undefined || results == null || results.length == 0) {
                    callback(new Error('Unexpectedly empty unique field value aggregation'));

                    return;
                }
                var values = results.map(function(el) { return el._id; });
                //
                // remove illegal values
                var illegalValues = []; // default val
                if (dataSourceDescription.fe_filters_valuesToExcludeByOriginalKey) {
                    if (dataSourceDescription.fe_filters_valuesToExcludeByOriginalKey._all) {
                        illegalValues = illegalValues.concat(dataSourceDescription.fe_filters_valuesToExcludeByOriginalKey._all);
                    }
                    var illegalValuesForThisKey = dataSourceDescription.fe_filters_valuesToExcludeByOriginalKey[key];
                    if (illegalValuesForThisKey) {
                        illegalValues = illegalValues.concat(illegalValuesForThisKey);
                    }
                }                
                //
                var illegalValues_length = illegalValues.length;
                for (var i = 0 ; i < illegalValues_length ; i++) {
                    var illegalVal = illegalValues[i];
                    var idxOfIllegalVal = values.indexOf(illegalVal);
                    if (idxOfIllegalVal !== -1) {
                        values.splice(idxOfIllegalVal, 1);
                    }
                }
                // Note here we use the human-readable key. We decode it back to the original key at query-time
                delete uniqueFieldValuesByFieldName[key]; // so no stale values persist in hash
                var finalizedStorageKey = dataSourceDescription.fe_displayTitleOverrides[key] || key;
                uniqueFieldValuesByFieldName[finalizedStorageKey] = values;
                cb();
            });
        }, function(err) 
        {
            if (err) {
                callback(err, null);
            
                return;
            }
            // Override values
            var oneToOneOverrideWithValuesByTitleByFieldName = dataSourceDescription.fe_filters_oneToOneOverrideWithValuesByTitleByFieldName || {};
            var fieldNamesToOverride = Object.keys(oneToOneOverrideWithValuesByTitleByFieldName);
            async.each(fieldNamesToOverride, function(fieldName, cb) 
            {
                var oneToOneOverrideWithValuesByTitle = oneToOneOverrideWithValuesByTitleByFieldName[fieldName];
                var titles = Object.keys(oneToOneOverrideWithValuesByTitle);
                uniqueFieldValuesByFieldName[fieldName] = titles;
                cb();
            }, function(err) 
            {
                if (err) {
                    callback(err, null);
            
                    return;
                }
                var persistableDoc =
                {
                    srcDocPKey: dataSourceRevision_pKey,
                    limitedUniqValsByHumanReadableColName: uniqueFieldValuesByFieldName
                };
                var cached_values_model = require('../cached_values/cached_values_model');
                cached_values_model.MongooseModel.findOneAndUpdate({ srcDocPKey: dataSourceRevision_pKey }, persistableDoc, {
                    upsert: true,
                    new: true
                }, function (err, doc) 
                {
                  if (err) {
                      callback(err, null);
                      
                      return;
                  }
                  winston.info("✅  Inserted cachedUniqValsByKey for \"" + dataSource_title + "\".");
                  callback(null, null);
                });
            });
        });
    });
};
