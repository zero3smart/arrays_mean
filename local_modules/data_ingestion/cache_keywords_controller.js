var winston = require('winston');
var mongoose_client = require('../mongoose_client/mongoose_client');
//
//
////////////////////////////////////////////////////////////////////////////////
// Controller definition
//
var constructor = function(options, context)
{
    var self = this;
    self.options = options
    self.context = context

    self._init()

    return self
};
//
constructor.prototype._init = function()
{
    var self = this;
    // console.log("cache keywords controller is up")
};
//
constructor.prototype.cacheKeywords_fromDataSourceDescription = function(dataSourceDescription, callback)
{
    var self = this;
    if (!dataSourceDescription.fe_wordCloud_defaultGroupByColumnName_humanReadable) return callback();

    mongoose_client.WhenMongoDBConnected(function() {
        var dataSource_uid = dataSourceDescription.uid;
        var dataSource_importRevision = dataSourceDescription.importRevision;
        var dataSource_title = dataSourceDescription.title;
        var dataset_uid = dataSourceDescription.dataset_uid;
        //
        winston.info("🔁  Caching keywords operation for \"" + dataSource_title + "\"");

        var realFieldName = dataSourceDescription.fe_wordCloud_defaultGroupByColumnName_humanReadable;
        var fe_displayTitleOverrides = dataSourceDescription.fe_displayTitleOverrides || {};
        var originalKeys = Object.keys(fe_displayTitleOverrides);
        for (var i = 0; i < originalKeys.length; i++) {
            var overrideTitle = fe_displayTitleOverrides[originalKeys[i]];
            if (overrideTitle === dataSourceDescription.fe_wordCloud_defaultGroupByColumnName_humanReadable) {
                realFieldName = originalKeys[i];
                break;
            }
        }

        var pKey_ofDataSrcDocBeingProcessed = self.context.raw_source_documents_controller.NewCustomPrimaryKeyStringWithComponents(dataSource_uid, dataSource_importRevision);

        //
        var mongooseContext_ofTheseProcessedRowObjects = self.context.processed_row_objects_controller.Lazy_Shared_ProcessedRowObject_MongooseContext(pKey_ofDataSrcDocBeingProcessed);
        var mongooseModel_ofTheseProcessedRowObjects = mongooseContext_ofTheseProcessedRowObjects.Model;
        var nativeCollection_ofTheseProcessedRowObjects = mongooseModel_ofTheseProcessedRowObjects.collection;
        //
        var bulkOperation_ofTheseProcessedRowObjects = nativeCollection_ofTheseProcessedRowObjects.initializeUnorderedBulkOp();

        self.context.processed_row_objects_controller.EnumerateProcessedDataset(
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

                dataSourceDescription.fe_wordCloud_keywords.forEach(function (keyword) {
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

                eachCb();
            },
            function (err) {
                winston.error("❌  Error encountered while caching keywords operation \"" + dataSource_title + "\".");
                callback(err); // bail early
            },
            function () {
                // Finished iterating … execute the batch operation
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
            },
            {}
        );
    });
};

module.exports = constructor;