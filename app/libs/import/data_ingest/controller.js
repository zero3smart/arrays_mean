//
//
// 
var async = require("async");
var winston = require('winston');
var raw_source_documents = require('../../../models/raw_source_documents');
var processed_row_objects = require('../../../models/processed_row_objects');
var postimport_caching_controller = require('../cache/controller');
var processing = require('../../datasources/processing');
var import_raw_objects_controller = require('./raw_objects_controller');


//
// ---------- Multiple DataSource Operation ----------
//
module.exports.Import_rawObjects = function (dataSourceDescriptions,job, fn) {
    var i = 1;

    async.eachSeries(
        dataSourceDescriptions,
        function (dataSourceDescription, eachCb) {

            if (dataSourceDescription.useCustomView) {
                require(__dirname + '/../../../../user/' + dataSourceDescription._team.subdomain +  '/src/import').ParseAndImportRaw(i,dataSourceDescription,job,eachCb);
                
            } else {
                 import_raw_objects_controller.ParseAndImportRaw(i, dataSourceDescription,job, eachCb);
            }
           
            i++;
        },
        function (err) {


            if (err) {
                winston.info("❌  Error encountered during raw objects import:", err);
                job.log("❌  Error encountered during raw objects import:", err);
                fn(err);
            } else {
                winston.info("✅  Raw objects import done.");
                job.log("✅  Raw objects import done.");
                fn();
            }
        }
    );
};




var _Import_dataSourceDescriptions__enteringImageScrapingDirectly = function (dataSourceDescriptions,job, fn) {
    var self = this;
    var i = 1;
    async.eachSeries(
        dataSourceDescriptions,
        function (dataSourceDescription, eachCb) {
            winston.info("💬  " + i + ": Proceeding directly to image scraping and remainder of post-processing of \"" + dataSourceDescription.title + "\"");
            job.log("💬 Proceeding directly to image scraping and remainder of post-processing of \"" + dataSourceDescription.title + "\"");

            _proceedToScrapeImagesAndRemainderOfPostProcessing(i, dataSourceDescription, job,eachCb);
            i++;
        },
        function (err) {
            if (err) {
                winston.info("❌  Error encountered during image-scrapping:(" + err.code + ')', err);
                job.log("❌  Error encountered during image-scrapping:(" + err.code + ')', err);
                fn(err);
            } else {
                winston.info("✅  Import image-scrapping done.");
                job.log("✅  Import image-scrapping done.");
                fn();
            }
        }
    );
};

module.exports.Import_dataSourceDescriptions__enteringImageScrapingDirectly = _Import_dataSourceDescriptions__enteringImageScrapingDirectly;

module.exports.PostProcessRawObjects = function (dataSourceDescriptions,job, fn) {
    var i = 1;
    var omitImageScraping = true;

    async.eachSeries(
        dataSourceDescriptions,
        function (dataSourceDescription, eachCb) {

          
            _postProcess(i, dataSourceDescription,job,eachCb);
          
            // if (dataSourceDescription.dirty >= 3) omitImageScraping = false;
            i++;
        },
        function (err) {
            if (err) {
                winston.info("❌  Error encountered during import post-processing:", err.message);
                job.log("❌  Error encountered during import post-processing:", err.message);
                fn(err);
            } else {
                winston.info("✅  Import post-processing done.");
                job.log("✅  Import post-processing done.")
                
                // if (!omitImageScraping) {
                //     _ScrapImagesOfPostProcessing_dataSourceDescriptions(dataSourceDescriptions,job, fn)
                // } else {

                    _AfterGeneratingProcessing_dataSourceDescriptions(dataSourceDescriptions,job, fn)
                // }
            }
        }
    );
};


// var _ScrapImagesOfPostProcessing_dataSourceDescriptions = function (dataSourceDescriptions,job,fn) {
//     var i = 1;
//     job.log('💬 proceed to image scraping for dataset'); 
//     async.eachSeries(
//         dataSourceDescriptions,
//         function (dataSourceDescription, eachCb) {
//             _proceedToScrapeImagesAndRemainderOfPostProcessing(i, dataSourceDescription,job, eachCb);
//             i++;
//         },
//         function (err) {
//             if (err) {
//                 winston.info("❌  Error encountered during image-scrapping:(" + err.code + ')', err);

//                 if (err.code == 'ECONNRESET' || err.code == 'ENOTFOUND' || err.code == 'ETIMEDOUT') {
//                     winston.info("💬  Waiting 3 seconds to restart...");

//                     setTimeout(function () {
//                         _Import_dataSourceDescriptions__enteringImageScrapingDirectly(job,dataSourceDescriptions);
//                     }, 3000);
//                 } else {
//                     fn(err);
//                 }
//             } else {
//                 winston.info("✅  Image-scraping done.");
//                 winston.info("✅  All done for importing data");
//                 job.log("✅  Image-scraping and importing data all done.");
//                 fn();
//             }
//         }
//     );
// }
//
var _AfterGeneratingProcessing_dataSourceDescriptions = function (dataSourceDescriptions,job, fn) {
    //
    // Execute user-defined generalized post-processing pipeline since the image scrapping is omitted
    //
    var i = 1;
    async.eachSeries(
        dataSourceDescriptions,
        function (dataSourceDescription, eachCb) {

            if (dataSourceDescription.useCustomView) {
                require(__dirname + '/../../../../user/' + dataSourceDescription._team.subdomain +  '/src/import').afterGeneratingProcessedDataSet_performEachRowOperations(i,dataSourceDescription,job,eachCb);
            } else {
                 _afterGeneratingProcessedDataSet_performEachRowOperations(i, dataSourceDescription,job, eachCb);
            }
            
           
            i++;
        },
        function (err) {
            if (err) {
                winston.info("❌  Error encountered during performing each-row operations:(" + err.code + ')', err);
                job.log("❌  Error encountered during performing each-row operations:(" + err.code + ')', err);
                fn(err);
            } else {
                winston.info("✅  All done for importing data");
                job.log("✅  All done for importing data");
                fn();
            }
        }
    );
}

module.exports.AfterGeneratingProcessing_dataSourceDescriptions = _AfterGeneratingProcessing_dataSourceDescriptions;

// ---------- Single DataSource Operation ----------
//
var _postProcess = function (indexInList, dataSourceDescription,job, callback) {
    var dataSource_uid = dataSourceDescription.uid;
    var dataSource_importRevision = dataSourceDescription.importRevision;
    var dataSource_title = dataSourceDescription.title;
    var dataset_uid = dataSourceDescription.dataset_uid;

    winston.info("🔁  " + indexInList + ": Post-processing \"" + dataSource_title + "\"");
    job.log("🔁  Post-processing \"" + dataSource_title + "\"");
    //
    //
    // Firstly, generate the whole processed objects dataset
    //
    //processed_row_objects.GenerateProcessedDatasetFromRawRowObjects
    processed_row_objects.InsertProcessedDatasetFromRawRowObjects
    (
        job,
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
            job.log("🔁  Now generating fields by joining datasets ");
            async.eachSeries(
                dataSourceDescription.relationshipFields,
                function (description, cb) {
                    var by = description.by;
                    var formingRelationship = typeof description.relationship !== 'undefined' && description.relationship == true ? true : false;
                    switch (by.operation) {
                        case "Join":
                        {
                            var matchFn = by.matchFn;
                            if (typeof matchFn === 'undefined' || matchFn == null) {
                                matchFn = "LocalEqualsForeignString";
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

var _proceedToScrapeImagesAndRemainderOfPostProcessing = function (indexInList, dataSourceDescription,job, callback) {

    async.eachSeries(
        dataSourceDescription.imageScraping,
        function (description, cb) {
            processed_row_objects.GenerateImageURLFieldsByScraping(dataSourceDescription._team.subdomain,dataSourceDescription.uid,
                dataSourceDescription.importRevision,
                dataSourceDescription.title,
                dataSourceDescription.dataset_uid,
                description.htmlSourceAtURLInField,
                description.setFields,
                cb);
        },
        function (err) {
            if (err) {
                winston.error("❌  Error encountered while scraping image with \"" + dataSourceDescription.title + "\".");
                job.log("❌  Error encountered while scraping image with \"" + dataSourceDescription.title + "\".");
                return callback(err);
            }

          
            _afterGeneratingProcessedDataSet_performEachRowOperations(indexInList, dataSourceDescription,job, callback);
             
        }
    );
}
//


var _afterGeneratingProcessedDataSet_performEachRowOperations = function (indexInList, dataSourceDescription,job, callback) {
    var dataSource_uid = dataSourceDescription.uid;
    var dataSource_importRevision = dataSourceDescription.importRevision;
    var dataSource_title = dataSourceDescription.title;
    var dataset_uid = dataSourceDescription.dataset_uid;


    var srcDoc_pKey = raw_source_documents.NewCustomPrimaryKeyStringWithComponents(dataSource_uid, dataSource_importRevision);
    var forThisDataSource_mongooseContext = processed_row_objects.Lazy_Shared_ProcessedRowObject_MongooseContext(srcDoc_pKey);
    var forThisDataSource_rowObjects_modelName = forThisDataSource_mongooseContext.Model.modelName;
    var forThisDataSource_RawRowObject_model = forThisDataSource_mongooseContext.Model.model;
    var forThisDataSource_nativeCollection = forThisDataSource_mongooseContext.Model.collection;
    var mergeFieldsIntoCustomField_BulkOperation = forThisDataSource_nativeCollection.initializeUnorderedBulkOp();


    //
    winston.info("🔁  Performing each-row operation for \"" + dataSource_title + "\"");

    job.log("🔁  Performing each-row operation and creating custom fields for \"" + dataSource_title + "\"");

    var eachCtx;
    var eachCtx = dataSourceDescription.customFieldsToProcess;

    if (typeof dataSourceDescription.fe_nestedObject != 'undefined' && dataSourceDescription.fe_nestedObject.prefix) {
        eachCtx = dataSourceDescription.fe_nestedObject;
        eachCtx.nested = true;
        eachCtx.numberOfInsertedRows = 0;
        eachCtx.numberOfRows = 0;
        eachCtx.cached = [];
    }

    startIterations();

    function startIterations() {

        /*eachCtx could be array or object*/

        if (eachCtx == null || typeof eachCtx == 'undefined' || (Array.isArray(eachCtx) && !eachCtx.length) ||
            (!Array.isArray(eachCtx) && !eachCtx.fields.length)) {
            continueToAfterIterating();
        } else {
            eachCtx.mergeFieldsIntoCustomField_BulkOperation = mergeFieldsIntoCustomField_BulkOperation;

            processed_row_objects.EnumerateProcessedDataset(
                dataSource_uid,
                dataSource_importRevision,
                dataset_uid,
                function (doc, eachCb) {
                    afterGeneratingProcessedRowObjects_eachRowFn(eachCtx, doc, eachCb);
                },
                function (err) {
                    winston.error("❌  Error encountered while performing each-row operations \"" + dataSource_title + "\".");
                    job.log("❌  Error encountered while performing each-row operations \"" + dataSource_title + "\".");
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

        var bulkOperationQueryFragment;

        if (typeof eachCtx.nested !== 'undefined' && eachCtx.nested == true) {

            if (!ifHasAndMeetCriteria(eachCtx, rowDoc)) {
                var updateFragment = {$pushAll: {}};
                for (var i = 0; i < eachCtx.fields.length; i++) {

                    var fieldName = eachCtx.fields[i];
                    var generatedArray = [];


                    eachCtx.cached.forEach(function (rowDoc) {

                        var fieldValue = rowDoc["rowParams"][fieldName];

                        if (eachCtx.valueOverrides[fieldName]) {
                            var keys = Object.keys(eachCtx.valueOverrides[fieldName]);
                            keys.forEach(function (key) {
                                var re = new RegExp(key, 'i');
                                fieldValue = fieldValue.replace(re, eachCtx.valueOverrides[fieldName][key])
                            });
                        }
                        generatedArray.push(fieldValue);

                        bulkOperationQueryFragment =
                        {
                            pKey: rowDoc.pKey, // the specific row
                            srcDocPKey: rowDoc.srcDocPKey // of its specific source (parent) document
                        };
                        eachCtx.mergeFieldsIntoCustomField_BulkOperation.find(bulkOperationQueryFragment).remove();
                    });


                    if (eachCtx.fieldOverrides[fieldName]) {
                        fieldName = eachCtx.fieldOverrides[fieldName];
                    }
                    updateFragment["$pushAll"]["rowParams." + eachCtx.prefix + fieldName] = generatedArray;
                }
                // Insert the nested object into the main row
                if (updateFragment["$pushAll"] && Object.keys(updateFragment['$pushAll']).length > 0) {
                    bulkOperationQueryFragment =
                    {
                        pKey: rowDoc.pKey, // the specific row
                        srcDocPKey: rowDoc.srcDocPKey // of its specific source (parent) document
                    };

                    eachCtx.mergeFieldsIntoCustomField_BulkOperation.find(bulkOperationQueryFragment).upsert().update(updateFragment);


                    eachCtx.cached = [];
                }
                eachCtx.numberOfInsertedRows++;

            } else {
                eachCtx.cached.push(rowDoc);
            }
            eachCtx.numberOfRows++;
        } else {
            for (var i = 0; i < eachCtx.length; i++) {
                var newFieldName = eachCtx[i].fieldName;
                var newFieldType = eachCtx[i].fieldType;
                if (newFieldType == 'array') {
                    var fieldsToMergeIntoArray = eachCtx[i].fieldsToMergeIntoArray;
                    var delimiterArrays = eachCtx[i].delimiterOnFields;
                    var new_array = mergeAllFieldsToArray(fieldsToMergeIntoArray,delimiterArrays, rowDoc, null);
             

                    var updateQuery = addToSet(newFieldName, new_array);
    
                    bulkOperationQueryFragment =
                    {
                        pKey: rowDoc.pKey,
                        srcDocPKey: rowDoc.srcDocPKey
                    };

                    eachCtx.mergeFieldsIntoCustomField_BulkOperation.find(bulkOperationQueryFragment).upsert().update(updateQuery);
                     
                } else if (newFieldType == 'object') {


                }
            }
        }
        cb();
    }



    function ifHasAndMeetCriteria(ctx, rowDoc) {


        if (ctx.criteria !== null && typeof ctx.criteria !== 'undefined') {
            var checkField = ctx.criteria.fieldName;
            var opr = ctx.criteria.operatorName;
            var val = ctx.criteria.value;

            if (opr == 'equal') {
                if (val == "") {
                    var ret = !rowDoc.rowParams[checkField] || rowDoc.rowParams[checkField] == "";
                    return ret;
                }

            } //other conditions to implement

        }

        return true;

    }

    function mergeAllFieldsToArray(withValuesInFieldsNamed,delimiterArrays, rowDoc) {

        var generatedArray = [];
        for (var i = 0; i < withValuesInFieldsNamed.length; i++) {
            var fieldName = withValuesInFieldsNamed[i];
            var fieldValue = rowDoc["rowParams"][fieldName];
            if (typeof fieldValue !== 'undefined' && fieldValue !== null && fieldValue !== "") {
                if (typeof delimiterArrays !== 'undefined' && Array.isArray(delimiterArrays) &&
                    delimiterArrays.length > 0) {
                    fieldValue = fieldValue.split(delimiterArrays[i]);
                    var refinedValue = [];
                    fieldValue.forEach(function(value) {
                        refinedValue.push(value.toString().trim());
                    });
                    generatedArray = generatedArray.concat(refinedValue);
                } else {
                    generatedArray.push(fieldValue);
                }
            }
        }
        return generatedArray;
    }

    function addToSet(generateFieldNamed, persistableValue) {
        var updateFragment = {$addToSet: {}};
        updateFragment["$addToSet"]["rowParams." + generateFieldNamed] = {"$each": persistableValue};

        return updateFragment;

    }

    function afterGeneratingProcessedRowObjects_afterIterating_eachRowFn(eachCtx, cb) {

        var writeConcern =
        {
            upsert: true
        };
        eachCtx.mergeFieldsIntoCustomField_BulkOperation.execute(writeConcern, function (err, result) {
            if (err) {
                winston.error("❌ [" + (new Date()).toString() + "] Error while saving custom fields  : ", err);
            } else {

                winston.info("✅  [" + (new Date()).toString() + "] Saved custom fields.");

                if (typeof eachCtx.nested != 'undefined' && eachCtx.nested == true) {

                    var srcDoc_pKey = raw_source_documents.NewCustomPrimaryKeyStringWithComponents(dataSource_uid, dataSource_importRevision);

                    raw_source_documents.IncreaseNumberOfRawRows(srcDoc_pKey, eachCtx.numberOfInsertedRows - eachCtx.numberOfRows,function(err) {
                        cb(err);
                    })

                } else {
                    cb(err);
                }

            }
        });
    }


    function continueToAfterIterating(eachCtx) {

        /* check object key length would not be appropriate because eacCtx could be array */

        if (eachCtx != null && typeof eachCtx != 'undefined' ) {

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