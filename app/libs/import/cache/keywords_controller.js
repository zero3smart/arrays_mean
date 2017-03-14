var winston = require('winston');
var mongoose_client = require('../../../models/mongoose_client');
var processed_row_objects = require('../../../models/processed_row_objects');
var raw_source_documents = require('../../../models/raw_source_documents');
//
//
var _cacheKeywords_fromDataSourceDescription = function (job,dataSourceDescription, callback) {
    if (!dataSourceDescription.fe_views || dataSourceDescription.fe_views.views == null || typeof dataSourceDescription.fe_views.views.wordCloud == 'undefined' || !dataSourceDescription.fe_views.views.wordCloud.defaultGroupByColumnName ||
        dataSourceDescription.fe_views.views.wordCloud.visible == false || 
        !dataSourceDescription.fe_views.views.wordCloud.keywords || dataSourceDescription.fe_views.views.wordCloud.keywords.length == 0) return callback();

    mongoose_client.WhenMongoDBConnected(function () {
       
        var dataSource_title = dataSourceDescription.fileName;
        var iterateDataset = dataSourceDescription._id;

        if (dataSourceDescription.schemaId) {
            iterateDataset = dataSourceDescription.schemaId;
        }
       
        winston.info("🔁  Caching keywords operation for \"" + dataSource_title + "\"");
        job.log("🔁  Caching keywords operation for \"" + dataSource_title + "\"");

        var realFieldName = dataSourceDescription.fe_views.views.wordCloud.defaultGroupByColumnName;


        
        var mongooseContext_ofTheseProcessedRowObjects = processed_row_objects.Lazy_Shared_ProcessedRowObject_MongooseContext(iterateDataset);
        var mongooseModel_ofTheseProcessedRowObjects = mongooseContext_ofTheseProcessedRowObjects.Model;
        var nativeCollection_ofTheseProcessedRowObjects = mongooseModel_ofTheseProcessedRowObjects.collection;
        //
        var bulkOperation_ofTheseProcessedRowObjects = nativeCollection_ofTheseProcessedRowObjects.initializeUnorderedBulkOp();
        var needToUpdate = false;

        processed_row_objects.EnumerateProcessedDataset(
            dataSourceDescription._id,
            dataSourceDescription.schemaId,
            function (doc, eachCb) {
                var fieldValues = [];
                if (doc.rowParams[realFieldName] != null) {
                    if (Array.isArray(doc.rowParams[realFieldName])) {
                        fieldValues = doc.rowParams[realFieldName];
                    } else {
                        fieldValues.push(doc.rowParams[realFieldName]);
                    }
                } else {
                    return eachCb();
                }

                var updateFragment = {$set: {}};

                dataSourceDescription.fe_views.views.wordCloud.keywords.forEach(function (keyword) {
                    var existence = false;
                    fieldValues.forEach(function (fieldValue) {
                        if (fieldValue.toLowerCase().indexOf(keyword.toLowerCase()) != -1) {
                            existence = true;
                        }
                    });

                    updateFragment["$set"]["wordExistence." + realFieldName + "." + keyword] = existence;
                });

                var bulkOperationQueryFragment =
                {
                    pKey: doc.pKey, // the specific row
                    srcDocPKey: doc.srcDocPKey // of its specific source (parent) document
                };

                bulkOperation_ofTheseProcessedRowObjects.find(bulkOperationQueryFragment).upsert().update(updateFragment);
                if (!needToUpdate) needToUpdate = true;

                eachCb();
            },
            function (err) {
                winston.error("❌  Error encountered while caching keywords operation \"" + dataSource_title + "\".");
                callback(err); // bail early
            },
            function () {
                // Finished iterating … execute the batch operation
                if (needToUpdate) {
             
                    bulkOperation_ofTheseProcessedRowObjects.execute(function (err, result) {
                        if (err) {
                            winston.error("❌  Error while caching keywords: ", err);
                        } else {
                            winston.info("✅  Cached keywords.");
                            job.log("✅  Cached keywords.")
                        }
                        callback(err);
                    });
                } else {
                    callback();
                }
            },
            {}
        );
    });
};
module.exports.cacheKeywords_fromDataSourceDescription = _cacheKeywords_fromDataSourceDescription;

module.exports.CacheKeywords_dataSourceDescriptions = function (dataSourceDescriptions, fn) {
    async.eachSeries(
        dataSourceDescriptions,
        function (dataSourceDescription, eachCb) {
            _cacheKeywords_fromDataSourceDescription(dataSourceDescription, eachCb);
        },
        function (err) {
            if (err) {
                winston.info("❌  Error encountered during cache keywords:", err);
            } else {
                winston.info("✅  Caching keywords done.");
            }
            fn(err);
        }
    );
};