//
//
// 
var async = require("async");
var winston = require('winston');
var raw_source_documents = require('../../../models/raw_source_documents');
var processed_row_objects = require('../../../models/processed_row_objects');



var import_processing = require('../../../datasources/utils/import_processing');
var import_raw_objects_controller = require('./import_raw_objects_controller');

//
// ---------- Multiple DataSource Operation ----------
//
module.exports.Import_dataSourceDescriptions = function (dataSourceDescriptions) {
    var i = 1;
    async.eachSeries(
        dataSourceDescriptions,
        function (dataSourceDescription, eachCb) {
            import_raw_objects_controller.ParseAndImportRaw(i, dataSourceDescription, eachCb);
            i++;
        },
        function (err) {
            if (err) {
                winston.info("❌  Error encountered during raw objects import:", err);
                process.exit(1); // error code
            } else {
                winston.info("✅  Raw objects import done. Proceeding to post-processing.");
                _PostProcessRawObjects(dataSourceDescriptions);
            }
        }
    );
};

var _Import_dataSourceDescriptions__enteringImageScrapingDirectly = function (dataSourceDescriptions) {
    var self = this;
    var i = 1;
    async.eachSeries(
        dataSourceDescriptions,
        function (dataSourceDescription, eachCb) {
            winston.info("💬  " + i + ": Proceeding directly to image scraping and remainder of post-processing of \"" + dataSourceDescription.title + "\"");
            _proceedToScrapeImagesAndRemainderOfPostProcessing(i, dataSourceDescription, eachCb);
            i++;
        },
        function (err) {
            if (err) {
                winston.info("❌  Error encountered during image-scrapping:(" + err.code + ')', err);

                if (err.code == 'ECONNRESET' || err.code == 'ENOTFOUND' || err.code == 'ETIMEDOUT') {
                    winston.info("💬  Waiting 3 seconds to restart...");
                    setTimeout(function () {
                        _Import_dataSourceDescriptions__enteringImageScrapingDirectly(dataSourceDescriptions);
                    }, 3000);
                } else {
                    process.exit(1); // error code
                }
            } else {
                winston.info("✅  Import image-scrapping done.");
                process.exit(0); // all good
            }
        }
    );
};
module.exports.Import_dataSourceDescriptions__enteringImageScrapingDirectly = _Import_dataSourceDescriptions__enteringImageScrapingDirectly;

var _PostProcessRawObjects = function (dataSourceDescriptions) {
    var i = 1;
    async.eachSeries(
        dataSourceDescriptions,
        function (dataSourceDescription, eachCb) {
            _postProcess(i, dataSourceDescription, eachCb);
            i++;
        },
        function (err) {
            if (err) {
                winston.info("❌  Error encountered during import post-processing:", err);
                process.exit(1); // error code
            } else {
                winston.info("✅  Import post-processing done.");
                var omitImageScrapping = true; // set true to omit image scraping,

                if (!omitImageScrapping) {
                    _ScrapImagesOfPostProcessing_dataSourceDescriptions(dataSourceDescriptions);
                } else {
                    _AfterGeneratingProcessing_dataSourceDescriptions(dataSourceDescriptions);
                }
            }
        }
    );
};

var _ScrapImagesOfPostProcessing_dataSourceDescriptions = function (dataSourceDescriptions) {
    var i = 1;
    async.eachSeries(
        dataSourceDescriptions,
        function (dataSourceDescription, eachCb) {
            _proceedToScrapeImagesAndRemainderOfPostProcessing(i, dataSourceDescription, eachCb);
            i++;
        },
        function (err) {
            if (err) {
                winston.info("❌  Error encountered during image-scrapping:(" + err.code + ')', err);

                if (err.code == 'ECONNRESET' || err.code == 'ENOTFOUND' || err.code == 'ETIMEDOUT') {
                    winston.info("💬  Waiting 3 seconds to restart...");

                    setTimeout(function () {
                        _Import_dataSourceDescriptions__enteringImageScrapingDirectly(dataSourceDescriptions);
                    }, 3000);
                } else {
                    process.exit(1); // error code
                }
            } else {
                winston.info("✅  Image-scrapping done.");
                process.exit(0); // all good
            }
        }
    );
}
//
var _AfterGeneratingProcessing_dataSourceDescriptions = function (dataSourceDescriptions) {
    //
    // Execute user-defined generalized post-processing pipeline since the image scrapping is omitted
    //
    var i = 1;
    async.eachSeries(
        dataSourceDescriptions,
        function (dataSourceDescription, eachCb) {
            _afterGeneratingProcessedDataSet_performEachRowOperations(i, dataSourceDescription, eachCb);
            i++;
        },
        function (err) {
            if (err) {
                winston.info("❌  Error encountered during performming each-row operations:(" + err.code + ')', err);
                process.exit(1); // error code
            } else {
                winston.info("✅  All done.");
                process.exit(0); // all good
            }
        }
    );
}

// ---------- Single DataSource Operation ----------
//
var _postProcess = function (indexInList, dataSourceDescription, callback) {
    var dataSource_uid = dataSourceDescription.uid;
    var dataSource_importRevision = dataSourceDescription.importRevision;
    var dataSource_title = dataSourceDescription.title;
    var dataset_uid = dataSourceDescription.dataset_uid;

    winston.info("🔁  " + indexInList + ": Post-processing \"" + dataSource_title + "\"");
    //
    //
    // Firstly, generate the whole processed objects dataset
    //
    //processed_row_objects.GenerateProcessedDatasetFromRawRowObjects
    processed_row_objects.InsertProcessedDatasetFromRawRowObjects(
        dataSource_uid,
        dataSource_importRevision,
        dataSource_title,
        dataset_uid,
        function (err) {
            if (err) {
                winston.error("❌  Error encountered while generating whole processed dataset \"" + dataSource_title + "\".");
                return callback(err);
            }
            //
            //
            // Now generate fields by joins, etc.
            //
            async.eachSeries(
                dataSourceDescription.afterImportingAllSources_generate,
                function (description, cb) {
                    var by = description.by;
                    var formingRelationship = typeof description.relationship !== 'undefined' && description.relationship == true ? true : false;
                    switch (by.doing) {
                        case import_processing.Ops.Join:
                        {
                            var matchFn = by.matchFn;
                            if (typeof matchFn === 'undefined' || matchFn == null) {
                                matchFn = import_processing.MatchFns.LocalEqualsForeignString;
                            }
                            processed_row_objects.GenerateFieldsByJoining_comparingWithMatchFn(
                                dataSource_uid,
                                dataSource_importRevision,
                                dataSource_title,
                                description.field,
                                description.singular,
                                by.findingMatchOnFields,
                                by.ofOtherRawSrcUID,
                                by.andOtherRawSrcImportRevision,
                                by.withLocalField,
                                by.obtainingValueFromField,
                                formingRelationship,
                                matchFn,
                                cb
                            );
                            break;
                        }

                        default:
                        {
                            winston.error("❌  Unrecognized post-processing field generation operation \"" + byDoingOp + "\" in", description);
                            break;
                        }
                    }
                },
                function (err) {
                    if (err) winston.error("❌  Error encountered while processing \"" + dataSource_title + "\".");
                    callback(err);
                }
            );
        });
};

var _proceedToScrapeImagesAndRemainderOfPostProcessing = function (indexInList, dataSourceDescription, callback) {
    async.eachSeries(
        dataSourceDescription.afterImportingAllSources_generateByScraping,
        function (description, cb) {
            processed_row_objects.GenerateImageURLFieldsByScraping(dataSourceDescription.uid,
                dataSourceDescription.importRevision,
                dataSourceDescription.title,
                dataSourceDescription.dataset_uid,
                description.htmlSourceAtURLInField,
                description.imageSrcSetInSelector,
                description.prependToImageURLs || "",
                description.useAndHostSrcSetSizeByField,
                cb);
        },
        function (err) {
            if (err) {
                winston.error("❌  Error encountered while scraping image with \"" + dataSourceDescription.title + "\".");
                return callback(err);
            }
            //
            //
            // Now execute user-defined generalized post-processing pipeline
            //
            _afterGeneratingProcessedDataSet_performEachRowOperations(indexInList, dataSourceDescription, callback);
        }
    );
}
//
var _afterGeneratingProcessedDataSet_performEachRowOperations = function (indexInList, dataSourceDescription, callback) {
    var dataSource_uid = dataSourceDescription.uid;
    var dataSource_importRevision = dataSourceDescription.importRevision;
    var dataSource_title = dataSourceDescription.title;
    var dataset_uid = dataSourceDescription.dataset_uid;


    var srcDoc_pKey = raw_source_documents.NewCustomPrimaryKeyStringWithComponents(dataSource_uid,dataSource_importRevision);
    var forThisDataSource_mongooseContext = processed_row_objects.Lazy_Shared_ProcessedRowObject_MongooseContext(srcDoc_pKey);
    var forThisDataSource_rowObjects_modelName = forThisDataSource_mongooseContext.Model.modelName;
    var forThisDataSource_RawRowObject_model = forThisDataSource_mongooseContext.Model.model;
    var forThisDataSource_nativeCollection = forThisDataSource_mongooseContext.Model.collection;
    var mergeFieldsIntoCustomField_BulkOperation = forThisDataSource_nativeCollection.initializeUnorderedBulkOp();



    //
    winston.info("🔁  Performing each-row operation for \"" + dataSource_title + "\"");
    //    
    var eachCtx = dataSourceDescription.customFieldsToProcess;

    startIterations();
    
    function startIterations() {
        if (eachCtx == null || typeof eachCtx == 'undefined') {
            continueToAfterIterating();
        } else {

            processed_row_objects.EnumerateProcessedDataset(
                dataSource_uid,
                dataSource_importRevision,
                dataset_uid,
                function (doc, eachCb) {
                    afterGeneratingProcessedRowObjects_eachRowFn(eachCtx, doc, eachCb);
                },
                function (err) {
                    winston.error("❌  Error encountered while performing each-row operations \"" + dataSource_title + "\".");
                    callback(err); // bail early
                },
                function () {
                    continueToAfterIterating(eachCtx); // done iterating each row
                },
                {}
            );
        }
    }


    function afterGeneratingProcessedRowObjects_eachRowFn(eachCtx, rowDoc, cb) {

        for (var i = 0; i < eachCtx.length; i++) {
            var newFieldName = eachCtx[i].fieldName;
            var newFieldType = eachCtx[i].fieldType;
            if (newFieldType == 'array') {
                var fieldsToMergeIntoArray  = eachCtx[i].fieldsToMergeIntoArray;
                var new_array = mergeAllFieldsToArray(newFieldName,fieldsToMergeIntoArray,rowDoc);
                var updateQuery = addToSet(newFieldName,new_array);

                var bulkOperationQueryFragment =
                {
                    pKey: rowDoc.pKey, 
                    srcDocPKey: rowDoc.srcDocPKey 
                };
                eachCtx.mergeFieldsIntoCustomField_BulkOperation = mergeFieldsIntoCustomField_BulkOperation ;
                eachCtx.mergeFieldsIntoCustomField_BulkOperation.find(bulkOperationQueryFragment).upsert().update(updateQuery);

            } else if (newFieldType == 'object') {
                
            }
        }
        cb();
    }

    function mergeAllFieldsToArray(generateFieldNamed,withValuesInFieldsNamed,rowDoc) {
        var generatedArray = [];
         for (var i = 0; i < withValuesInFieldsNamed.length; i++) {
            var fieldName = withValuesInFieldsNamed[i];
            var fieldValue = rowDoc["rowParams"][fieldName];
            if (typeof fieldValue !== 'undefined' && fieldValue !== null && fieldValue !== "") {
                generatedArray.push(fieldValue);
            }
        }
        return generatedArray;
    }

    function addToSet (generateFieldNamed,persistableValue) {
        var updateFragment = {$addToSet: {}};
        updateFragment["$addToSet"]["rowParams." + generateFieldNamed] = {"$each": persistableValue};

        return updateFragment;

    }

    function afterGeneratingProcessedRowObjects_afterIterating_eachRowFn (eachCtx, cb) {
        var writeConcern =
        {
            upsert: true 
        };
        eachCtx.mergeFieldsIntoCustomField_BulkOperation.execute(writeConcern, function (err, result)
            
        {
            if (err) {
                winston.error("❌ [" + (new Date()).toString() + "] Error while saving raw row objects: ", err);
            } else {
                winston.info("✅  [" + (new Date()).toString() + "] Saved raw row objects.");
            }
            cb(err); // all done - must call DB
        });
    }



    function continueToAfterIterating(eachCtx) {

    
        if (eachCtx != null || typeof eachCtx != 'undefined') {

            afterGeneratingProcessedRowObjects_afterIterating_eachRowFn(
                eachCtx,
                function (err) {
                    if (err) {
                        winston.error("❌  Error encountered while performing each-row operations \"" + dataSource_title + "\".");
                    } else {
                        winston.info("✅  " + indexInList + ": Done processing \"" + dataSource_title + "\".");
                    }
                    //
                    callback(err);
                }
            );
        } else {
            winston.info("✅  " + indexInList + ": Done processing \"" + dataSource_title + "\".");
            callback(); // all done
        }
    }
};