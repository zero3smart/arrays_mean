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
    //
    winston.info("🔁  Performing each-row operation for \"" + dataSource_title + "\"");
    //    
    var eachCtx = {};
    if (dataSourceDescription.afterGeneratingProcessedRowObjects_setupBefore_eachRowFn) {
        dataSourceDescription.afterGeneratingProcessedRowObjects_setupBefore_eachRowFn(
            eachCtx,
            function (err) {
                if (err) {
                    winston.error("❌  Error encountered while performing each-row operations \"" + dataSource_title + "\".");
                    return callback(err);
                }
                continueToIterations();
            }
        );
    } else {
        continueToIterations();
    }
    function continueToIterations() {
        if (!dataSourceDescription.afterGeneratingProcessedRowObjects_eachRowFn) {
            continueToAfterIterating();
        } else {
            processed_row_objects.EnumerateProcessedDataset(
                dataSource_uid,
                dataSource_importRevision,
                dataset_uid,
                function (doc, eachCb) {
                    dataSourceDescription.afterGeneratingProcessedRowObjects_eachRowFn(eachCtx, doc, eachCb);
                },
                function (err) {
                    winston.error("❌  Error encountered while performing each-row operations \"" + dataSource_title + "\".");
                    callback(err); // bail early
                },
                function () {
                    continueToAfterIterating(); // done iterating each row
                },
                {}
            );
        }
    }

    function continueToAfterIterating() {
        if (dataSourceDescription.afterGeneratingProcessedRowObjects_afterIterating_eachRowFn) {
            dataSourceDescription.afterGeneratingProcessedRowObjects_afterIterating_eachRowFn(
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