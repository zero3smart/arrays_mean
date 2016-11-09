var winston = require('winston');
var mongoose_client = require('../../../../lib/mongoose_client/mongoose_client');
var processed_row_objects = require('../../../models/processed_row_objects');
var raw_source_documents = require('../../../models/raw_source_documents');
//
//
var _cacheKeywords_fromDataSourceDescription = function (dataSourceDescription, callback) {
    if (dataSourceDescription.fe_views.views == null || typeof dataSourceDescription.fe_views.views.wordCloud == 'undefined' || !dataSourceDescription.fe_views.views.wordCloud.defaultGroupByColumnName ||
        dataSourceDescription.fe_views.views.wordCloud.visible == false ) return callback();

    mongoose_client.WhenMongoDBConnected(function () {
        var dataSource_uid = dataSourceDescription.uid;
        var dataSource_importRevision = dataSourceDescription.importRevision;
        var dataSource_title = dataSourceDescription.title;
        var dataset_uid = dataSourceDescription.dataset_uid;
        //
        winston.info("🔁  Caching keywords operation for \"" + dataSource_title + "\"");

        var realFieldName = dataSourceDescription.fe_views.views.wordCloud.defaultGroupByColumnName;

        var pKey_ofDataSrcDocBeingProcessed = raw_source_documents.NewCustomPrimaryKeyStringWithComponents(dataSource_uid, dataSource_importRevision);

        //
        var mongooseContext_ofTheseProcessedRowObjects = processed_row_objects.Lazy_Shared_ProcessedRowObject_MongooseContext(pKey_ofDataSrcDocBeingProcessed);
        var mongooseModel_ofTheseProcessedRowObjects = mongooseContext_ofTheseProcessedRowObjects.Model;
        var nativeCollection_ofTheseProcessedRowObjects = mongooseModel_ofTheseProcessedRowObjects.collection;
        //
        var bulkOperation_ofTheseProcessedRowObjects = nativeCollection_ofTheseProcessedRowObjects.initializeUnorderedBulkOp();
        var needToUpdate = false;

        processed_row_objects.EnumerateProcessedDataset(
            dataSource_uid,
            dataSource_importRevision,
            dataset_uid,
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
                        if (fieldValue.toLowerCase().indexOf(keyword) != -1) {
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
                    var writeConcern =
                    {
                        upsert: true // might as well - but this is not necessary
                    };
                    bulkOperation_ofTheseProcessedRowObjects.execute(writeConcern, function (err, result) {
                        if (err) {
                            winston.error("❌  Error while caching keywords: ", err);
                        } else {
                            winston.info("✅  Cached keywords.");
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

module.exports.CacheKeywords_dataSourceDescriptions = function (dataSourceDescriptions) {
    var self = this;
    async.eachSeries(
        dataSourceDescriptions,
        function (dataSourceDescription, eachCb) {
            _cacheKeywords_fromDataSourceDescription(dataSourceDescription, eachCb);
        },
        function (err) {
            if (err) {
                winston.info("❌  Error encountered during cache keywords:", err);
                process.exit(1); // error code
            } else {
                winston.info("✅  Caching keywords done.");
                process.exit(0); // all good
            }
        }
    );
};