var async = require('async');
var winston = require('winston');
var raw_source_documents = require('./raw_source_documents');
var raw_row_objects = require('./raw_row_objects');
var mongoose_client = require('./mongoose_client');
var processing = require('../libs/datasources/processing');
var mongoose = mongoose_client.mongoose;
var Schema = mongoose.Schema;

var New_RowObjectsModelName = function (srcDocPKey) {
    return 'ProcessedRowObjects-' + srcDocPKey;
};

var MongooseContextsBySrcDocPKey = {};

var _new_byPathUpdateDoc_fromPureDocUpdates = function (doc) {
    var byPathUpdateDoc = {};
    var rootKeys = Object.keys(doc);
    var rootKeys_length = rootKeys.length;
    for (var i = 0; i < rootKeys_length; i++) {
        var key = rootKeys[i];
        var val = doc[key];
        if (key !== 'rowParams') {
            byPathUpdateDoc[key] = val;
        } else {
            var rowParams_keys = Object.keys(val);
            var rowParams_keys_length = rowParams_keys.length;
            for (var i = 0; i < rowParams_keys_length; i++) {
                var rowParams_key = rowParams_keys[i];
                var rowParams_val = val[rowParams_key];
                byPathUpdateDoc['rowParams.' + rowParams_key] = rowParams_val;
            }
        }
    }

    return byPathUpdateDoc;
}

module.exports.New_templateForPersistableObject = function (rowObject_primaryKey,
                                                            sourceDocumentRevisionKey,
                                                            rowParams) {
    return {
        pKey: rowObject_primaryKey, // Queries to find this unique row will have to happen
        srcDocPKey: sourceDocumentRevisionKey, // by pKey && srcDocPKey
        rowParams: rowParams
    };
};


var _Lazy_Shared_ProcessedRowObject_MongooseContext = function (srcDocPKey) {


    var mongooseContext = MongooseContextsBySrcDocPKey[srcDocPKey];
    if (mongooseContext && typeof mongooseContext !== 'undefined') { // lazy cache, to avoid mongoose model re-definition error
        return mongooseContext;
    }
    //
    var Scheme = Schema({
        pKey: String,
        srcDocPKey: String,
        rowParams: Schema.Types.Mixed // be sure to call .markModified(path) on the model before saving if you update this Mixed property via Mongoose
    });
    Scheme.index({pKey: 1, srcDocPKey: 1}, {unique: true});
    Scheme.index({srcDocPKey: 1}, {unique: false});
    //
    var ModelName = New_RowObjectsModelName(srcDocPKey);
    var Model = mongoose.model(ModelName, Scheme);
    //
    mongooseContext =
    {
        Scheme: Scheme,
        ModelName: ModelName,
        Model: Model
    };
    MongooseContextsBySrcDocPKey[srcDocPKey] = mongooseContext;

    return mongooseContext;
};

module.exports.Lazy_Shared_ProcessedRowObject_MongooseContext = _Lazy_Shared_ProcessedRowObject_MongooseContext;

module.exports.InsertProcessedDatasetFromRawRowObjects = function (job,dataSource_uid,
                                                                   dataSource_importRevision,
                                                                   dataSource_title,
                                                                   dataset_uid,
                                                                   callback) {
    mongoose_client.WhenMongoDBConnected(function () { // ^ we block because we're going to work with the native connection; Mongoose doesn't block til connected for any but its own managed methods
        winston.info("🔁  Pre-generating whole processed row objects collection from raw row objects of \"" + dataSource_title + "\".");

        var pKey_ofDataSrcDocBeingProcessed = raw_source_documents.NewCustomPrimaryKeyStringWithComponents(dataSource_uid, dataSource_importRevision);
        //
        var mongooseContext_ofRawRowObjectsBeingProcessed = raw_row_objects.Lazy_Shared_RawRowObject_MongooseContext(pKey_ofDataSrcDocBeingProcessed);
        var mongooseModel_ofRawRowObjectsBeingProcessed = mongooseContext_ofRawRowObjectsBeingProcessed.forThisDataSource_RawRowObject_model;
        //
        var mongooseContext_ofTheseProcessedRowObjects = _Lazy_Shared_ProcessedRowObject_MongooseContext(pKey_ofDataSrcDocBeingProcessed);
        var mongooseModel_ofTheseProcessedRowObjects = mongooseContext_ofTheseProcessedRowObjects.Model;
        var nativeCollection_ofTheseProcessedRowObjects = mongooseModel_ofTheseProcessedRowObjects.collection;

        var updateDocs = [];

        var datasetQuery = dataset_uid ? {pKey: {$regex: "^" + dataset_uid + "-"}} : {};


        var cursor = mongooseModel_ofRawRowObjectsBeingProcessed.find(datasetQuery).cursor()
        var count = 0;
        var err = null
        cursor.on('data', function (doc) {

            count += 1;
            nativeCollection_ofTheseProcessedRowObjects.insertOne(doc._doc, {ordered: false}, function (err) {
                if (err) {
                    err = err
                    winston.error("❌ [" + (new Date()).toString() + "] Error from line 121 while saving processed row objects: ", err);
                }
            })
          
            if (count % 1000 == 0 && count !== 0) {
                winston.info("✅  parsed " + count + " of the row object documents  for \"" + dataSource_title + "\"." );
                job.log("✅  parsed " + count + " of the row object documents  for \"" + dataSource_title + "\".");
            }
          
        }).on('error', function (err) {

            winston.error("❌ error with cursor" + err)
                return callback(err)

        }).on('end', function () {

            winston.info("✅  [" + (new Date()).toString() + "] Saved collection of processed row objects. Used " + process.memoryUsage().heapUsed + " heap memory. Inserted " + count + " processed rows for\"" + dataSource_title + "\".");
            job.log("✅  [" + (new Date()).toString() + "] Saved collection of processed row objects.")
            return callback(err)

        })
    });
};

module.exports.GenerateProcessedDatasetFromRawRowObjects = function (dataSource_uid,
                                                                     dataSource_importRevision,
                                                                     dataSource_title,
                                                                     callback) {
    mongoose_client.WhenMongoDBConnected(function () { // ^ we block because we're going to work with the native connection; Mongoose doesn't block til connected for any but its own managed methods
        winston.info("🔁  Pre-generating whole processed row objects collection from raw row objects of \"" + dataSource_title + "\".");

        var pKey_ofDataSrcDocBeingProcessed = raw_source_documents.NewCustomPrimaryKeyStringWithComponents(dataSource_uid, dataSource_importRevision);
        //
        var mongooseContext_ofRawRowObjectsBeingProcessed = raw_row_objects.Lazy_Shared_RawRowObject_MongooseContext(pKey_ofDataSrcDocBeingProcessed);
        var mongooseModel_ofRawRowObjectsBeingProcessed = mongooseContext_ofRawRowObjectsBeingProcessed.forThisDataSource_RawRowObject_model;
        var nativeCollection_ofRawRowObjectsBeingProcessed = mongooseModel_ofRawRowObjectsBeingProcessed.collection;
        //
        var mongooseContext_ofTheseProcessedRowObjects = _Lazy_Shared_ProcessedRowObject_MongooseContext(pKey_ofDataSrcDocBeingProcessed);
        var mongooseModel_ofTheseProcessedRowObjects = mongooseContext_ofTheseProcessedRowObjects.Model;
        var nativeCollection_ofTheseProcessedRowObjects = mongooseModel_ofTheseProcessedRowObjects.collection;
        //
        var bulkOperation_ofTheseProcessedRowObjects = nativeCollection_ofTheseProcessedRowObjects.initializeUnorderedBulkOp();
        //
        var numDocs = 0; // to derive
        //
        function proceedToPersist() {
            winston.info("📡  [" + (new Date()).toString() + "] Upserting " + numDocs + " processed rows for \"" + dataSource_title + "\".");

            var writeConcern =
            {
                upsert: true
                // note: we're turning this off as it's super slow for large datasets like Artworks
                // j: true // 'requests acknowledgement from MongoDB that the write operation has been written to the journal'
            };
            bulkOperation_ofTheseProcessedRowObjects.execute(writeConcern, function (err, result) {
                if (err) {

                    winston.error("❌ [" + (new Date()).toString() + "] Error while saving processed row objects: ", err);
                } else {
                    winston.info("✅  [" + (new Date()).toString() + "] Saved collection of processed row objects.");
                }
                callback(err);
            });
        }

        //
        var hasErroredAndReturned = false;
        var hasReachedEndOfCursor = false;
        var numberOfDocumentsFoundButNotYetProcessed = 0;
        // Find all row raw objs
        nativeCollection_ofRawRowObjectsBeingProcessed.find({}, {}, function (err, cursor) {
            if (err) {
                winston.error("❌  Error while generating processed row objects:", err);
                hasErroredAndReturned = true;
                callback(err);

                return;
            }
            cursor.each(function (err, doc) {
                if (hasErroredAndReturned == true) {
                    winston.warn("⚠️  Each called after hasErroredAndReturned.");

                    return;
                }
                if (err) {
                    winston.error("❌  Error while generating processed row objects:", err);
                    hasErroredAndReturned = true;
                    callback(err);

                    return;
                }
                if (doc === null) { // then we're finished
                    // console.log("Reached end")
                    hasReachedEndOfCursor = true;
                    if (numberOfDocumentsFoundButNotYetProcessed == 0) { // in case we've already finished, i.e. if the operation we did with the docs was sync and not async
                        proceedToPersist();
                    }

                    return;
                }
                //
                numberOfDocumentsFoundButNotYetProcessed += 1;
                numDocs += 1;
                //
                function _finishedWithDoc() {


                    numberOfDocumentsFoundButNotYetProcessed -= 1; // finished with this doc - decrement
                    //
                    if (hasReachedEndOfCursor == true) {
                        if (numberOfDocumentsFoundButNotYetProcessed == 0) {
                            // console.log("Reached end of cursor and finished processing all")
                            proceedToPersist();
                        } else {
                            // console.log("Reached end of cursor but not finished processing all")
                        }
                    } else {
                        // console.log("Hasn't reached end of cursor")
                    }
                }

                //
                //
                var bulkOperationQueryFragment =
                {
                    pKey: doc.pKey,
                    srcDocPKey: doc.srcDocPKey
                };
                // we do not $set the whole doc but use rowParams.* paths so that 
                // we don't overwrite the whole doc, blowing away stuff like already-imported images
                var byPathUpdateDoc = _new_byPathUpdateDoc_fromPureDocUpdates(doc);
                bulkOperation_ofTheseProcessedRowObjects.find(bulkOperationQueryFragment).upsert().update({$set: byPathUpdateDoc});
                //
                _finishedWithDoc();
            });
        });
    });
}

module.exports.GenerateFieldsByJoining_comparingWithMatchFn = function (job,dataSource_uid,
                                                                        dataSource_importRevision,
                                                                        dataSource_title,
                                                                        generateFieldNamed,
                                                                        isSingular,
                                                                        findingMatchOnField,
                                                                        ofOtherRawSrcUID,
                                                                        andOtherRawSrcImportRevision,
                                                                        withLocalField,
                                                                        obtainingValueFromField_orUndefined,
                                                                        or_formingRelationship,
                                                                        /*doesFieldMatch_fn, */
                                                                        callback) {
    mongoose_client.WhenMongoDBConnected(function () { // ^ we block because we're going to work with the native connection; Mongoose doesn't block til connected for any but its own managed methods
        winston.info("🔁  Generating field \"" + generateFieldNamed
            + "\" of \"" + dataSource_title
            + "\" by joining on \"" + findingMatchOnField
            + "\" of data source \"" + ofOtherRawSrcUID + "\" revision \"" + andOtherRawSrcImportRevision + "\".");

        var pKey_ofFromDataSourceDoc = raw_source_documents.NewCustomPrimaryKeyStringWithComponents(ofOtherRawSrcUID, andOtherRawSrcImportRevision);
        var pKey_ofDataSrcDocBeingProcessed = raw_source_documents.NewCustomPrimaryKeyStringWithComponents(dataSource_uid, dataSource_importRevision);
        //
        // var mongooseContext_ofFromRawRowObjects = raw_row_objects.Lazy_Shared_RawRowObject_MongooseContext(pKey_ofFromDataSourceDoc);
        // var mongooseModel_ofFromRawRowObjects = mongooseContext_ofFromRawRowObjects.forThisDataSource_RawRowObject_model;
        //
        // var mongooseContext_ofRawRowObjectsBeingProcessed = raw_row_objects.Lazy_Shared_RawRowObject_MongooseContext(pKey_ofDataSrcDocBeingProcessed);
        // var mongooseModel_ofRawRowObjectsBeingProcessed = mongooseContext_ofRawRowObjectsBeingProcessed.forThisDataSource_RawRowObject_model;
        //
        var mongooseContext_ofTheseProcessedRowObjects = _Lazy_Shared_ProcessedRowObject_MongooseContext(pKey_ofDataSrcDocBeingProcessed);
        var mongooseModel_ofTheseProcessedRowObjects = mongooseContext_ofTheseProcessedRowObjects.Model;
        var nativeCollection_ofTheseProcessedRowObjects = mongooseModel_ofTheseProcessedRowObjects.collection;


        var processedrowobjects_fromSource = _Lazy_Shared_ProcessedRowObject_MongooseContext(pKey_ofFromDataSourceDoc).Model.collection;


        //
        var bulkOperation_ofTheseProcessedRowObjects = nativeCollection_ofTheseProcessedRowObjects.initializeUnorderedBulkOp();


        var skipping = 0 ;
        var batchLimit = 200;
        var counter = 1;
        var reachTheEnd = false;
        var processedrowobjectsCount = 0;

        async.until(function() {
            return reachTheEnd;
        },function(until_cb) {

            async.waterfall([
                // waterfall first function
                function(cb) {
                    var unwindQuery =  {
                      $unwind: '$' + "rowParams." + findingMatchOnField
                    };

                    var lookupQuery = {
                        $lookup: {
                                from: 'processedrowobjects-' + pKey_ofDataSrcDocBeingProcessed,
                                localField: "rowParams." + findingMatchOnField,
                                foreignField: "rowParams." + withLocalField,
                                as: "_" + generateFieldNamed
                            }
                        };
                    var matchQuery = {$match: {}};
                    matchQuery.$match["_" + generateFieldNamed] = {$ne:[]}


                    var field = "_" + generateFieldNamed;

                    var projectQuery = {$project: {}};
                    if (isSingular) {
                        projectQuery.$project["rowParams." + obtainingValueFromField_orUndefined] = 1;
                    } 
                    projectQuery.$project[field] = ["$" + field +"._id"];


                    processedrowobjects_fromSource.aggregate([

                        {$skip: skipping},
                        {$limit: batchLimit},
                        unwindQuery,
                        lookupQuery,
                        matchQuery,
                        projectQuery,
                        {$unwind: '$' + field}

                    ],function(err,joinedDoc) {
                        if (err) return cb(err);
                        processedrowobjectsCount += joinedDoc.length;
                        if (joinedDoc.length == 0) {
                            reachTheEnd = true;
                            return until_cb();
                        } else {
                            cb(null,joinedDoc);
                        }
                    })


                },
                //waterfall second function
                function(docs,cb) {
                    var concurrencyLimit = 20;
                    async.eachLimit(docs,concurrencyLimit,function(record,eachCb) {
                        var updateQuery = {$set:{}};

                        if (isSingular ||  typeof obtainingValueFromField_orUndefined !== 'undefined') {
                            updateQuery.$set["rowParams." + generateFieldNamed] = record.rowParams[obtainingValueFromField_orUndefined];
                        } else {
                            updateQuery = {$addToSet: {}};
                            updateQuery.$addToSet["rowParams."+ generateFieldNamed] = record["_id"]; //add to set
                        }
                        var findQuery = {_id:{$in: []}};
                        findQuery["_id"]["$in"] = record["_" + generateFieldNamed];
                        bulkOperation_ofTheseProcessedRowObjects.find(findQuery).update(updateQuery);
                        process.nextTick(function() { eachCb(); })
                    },cb);
                }
                
            ],function(err) { //waterfall final callback
                if (err) {
                    until_cb(err);
                } else {
                    winston.info("✅  processed " + processedrowobjectsCount + " records of the joined field " + generateFieldNamed);
                    job.log("✅  processed " + processedrowobjectsCount + " records of the joined field " + generateFieldNamed);
                    skipping = counter * batchLimit;
                    counter ++;
                    until_cb();
                }   
            })
        },function(err) {
            if (err) {
                 winston.error("❌  Error while generating field by reverse-join:", err);
                 return callback(err);
            } else {
                winston.info("📡  [" + (new Date()).toString() + "] Upserting processed rows for \"" + dataSource_title + "\" having generated fields named \"" + generateFieldNamed + "\".");
                job.log("📡  [" + (new Date()).toString() + "] Upserting processed rows for \"" + dataSource_title + "\" having generated fields named \"" + generateFieldNamed + "\".");

                bulkOperation_ofTheseProcessedRowObjects.execute(function (err, result) {
                    if (err) {
                        winston.error("❌ [" + (new Date()).toString() + "] Error while saving generated fields of processed row objects: ", err);
                        process.nextTick(function() {callback(err);})
                    } else {
                       
                      
                        var setToNull = {};
                        setToNull["rowParams." + generateFieldNamed] = {$exists: false}
                        var setTo = {$set:{}};
                        setTo.$set["rowParams."+ generateFieldNamed] = null
                        nativeCollection_ofTheseProcessedRowObjects.update(setToNull,setTo,{multi:true},function(err) {
                            if (err) {
                                winston.error("❌ [" + (new Date()).toString() + "] Error while saving generated fields of processed row objects: ", err);
                            } else {
                                winston.info("✅  [" + (new Date()).toString() + "] Saved generated fields \"" + generateFieldNamed + "\" on processed row objects, result: ", JSON.stringify(result));
                                job.log("✅  [" + (new Date()).toString() + "] Saved generated fields \"" + generateFieldNamed + "\" on processed row objects.");
                                process.nextTick(function() {callback(err);})
                                
                            }

                        })



                    }
                   
                });

            }
        })

        // mongooseModel_ofRawRowObjectsBeingProcessed.find({}, function (err, ofTheseProcessedRowObjectDocs) {
        //     if (err) {
        //         winston.error("❌  Error while generating field by reverse-join:", err);
        //         callback(err);

        //         return;
        //     }
        //     mongooseModel_ofFromRawRowObjects.find({}, function (err, fromProcessedRowObjectDocs) {
        //         if (err) {
        //             winston.error("❌  Error while generating field by reverse-join:", err);
        //             return callback(err);
        //         }
        //         var fromProcessedRowObjectDocs_length = fromProcessedRowObjectDocs.length;
        //         if (fromProcessedRowObjectDocs_length == 0) {
        //             var errorString = "No rows in foreign set " + pKey_ofFromDataSourceDoc + ".";
        //             var err = new Error(errorString);
        //             winston.error("❌  Error while generating field by reverse-join:", err);
        //             return callback(err);
        //         }
        //         var ofTheseProcessedRowObjectDocs_length = ofTheseProcessedRowObjectDocs.length;
        //         if (ofTheseProcessedRowObjectDocs_length == 0) {
        //             var errorString = "No rows in " + pKey_ofDataSrcDocBeingProcessed + ".";
        //             var err = new Error(errorString);
        //             winston.error("❌  Error while generating field by join:", err);
        //             return callback(err);
        //         }
        //         //
        //         for (var i = 0; i < ofTheseProcessedRowObjectDocs.length; i++) {
        //             if (i != 0 && i % 1000 == 0) {
        //                 winston.info("" + i + " / " + ofTheseProcessedRowObjectDocs_length + " of local '" + pKey_ofDataSrcDocBeingProcessed + "'  *  " + fromProcessedRowObjectDocs_length + " of foreign '" + pKey_ofFromDataSourceDoc + "'");
        //                 job.log("" + i + " / " + ofTheseProcessedRowObjectDocs_length + " of local '" + pKey_ofDataSrcDocBeingProcessed + "'  *  " + fromProcessedRowObjectDocs_length + " of foreign '" + pKey_ofFromDataSourceDoc + "'");
        //             }
        //             var ofTheseProcessedRowObjectDoc = ofTheseProcessedRowObjectDocs[i];
        //             var localFieldValue = ofTheseProcessedRowObjectDoc.rowParams["" + withLocalField];
        //             // now check if localFieldValue contains any of the foreignFieldValues in the matchOn fields
        //             var wasFound = false;
        //             var matchingForeignValues = [];
        //             for (var j = 0; j < findingMatchOnFields_length; j++) {
        //                 var matchOnField = findingMatchOnFields[j];
                    
        //                 for (var k = 0; k < fromProcessedRowObjectDocs_length; k++) {
        //                     // if (k != 0 && k % 10000 == 0) {
        //                     //     console.log("- Foreign: " + pKey_ofFromDataSourceDoc + ": " + k + " / " + fromProcessedRowObjectDocs_length);
        //                     // }
        //                     var fromProcessedRowObjectDoc = fromProcessedRowObjectDocs[k];
        //                     var foreignFieldValue = fromProcessedRowObjectDoc.rowParams[matchOnField];

                 


        //                     var doesFieldMatch = processing.MatchFns[doesFieldMatch_fn](localFieldValue, foreignFieldValue);

                        

        //                     if (doesFieldMatch == true) {
        //                         wasFound = true;
        //                         if (typeof obtainingValueFromField_orUndefined === 'undefined') {
        //                             if (or_formingRelationship == false) {
        //                                 var errorString = "Generate Join parameter configuration conflict: obtainingValueFromField was undefined as " + obtainingValueFromField_orUndefined + " but relationship=true";
        //                                 var err = new Error(errorString);
        //                                 winston.error("❌  Error while generating field by join:", err);
        //                                 callback(err);

        //                                 return;
        //                             }
        //                         } else {
        //                             if (or_formingRelationship == true) {
        //                                 var errorString = "Generate Join parameter configuration conflict: obtainingValueFromField was not undefined as " + obtainingValueFromField_orUndefined + " but relationship=false";
        //                                 var err = new Error(errorString);
        //                                 winston.error("❌  Error while generating field by join:", err);
        //                                 callback(err);

        //                                 return;
        //                             }
        //                         }
        //                         var foreignValueToExtract;
        //                         if (getIdInsteadOfValueFromField == true) {
        //                             foreignValueToExtract = fromProcessedRowObjectDoc._id;
        //                         } else {
        //                             foreignValueToExtract = fromProcessedRowObjectDoc.rowParams[obtainingValueFromField_orUndefined];
        //                         }
        //                         // console.log("foreignValueToExtract " , foreignValueToExtract)
        //                         if (typeof foreignValueToExtract === 'undefined') {
        //                             var errorString = "Value at \"" + obtainingValueFromField_orUndefined + "\" of foreign row object of \"" + ofOtherRawSrcUID + "\" was undefined… doc: " + JSON.stringify(fromProcessedRowObjectDoc, null, '  ');
        //                             var err = new Error(errorString);
        //                             winston.error("❌  Error while generating field by join:", err);
        //                             callback(err);

        //                             return;
        //                         }
        //                         matchingForeignValues.push(foreignValueToExtract);
        //                         if (isSingular == true) { // we have to check if it's singular here before we break
        //                             // otherwise we won't get all the possible values from all the foreign rows
        //                             break;
        //                         }
        //                     }
        //                 }
        //                 if (wasFound == true) {
        //                     if (isSingular == true) {
        //                         break; // since we don't need to try any more fields, as we got a singular value
        //                     } // otherwise, keep going until we have all the possible values of all fields from all rows
        //                 }
        //             }
        //             // if (wasFound == false) {
        //             //  winston.warn("⚠️  Still didn't find a result for fieldValue " + localFieldValue);
        //             // }
        //             // instead of checking wasFound == true here, we still want to persist 
        //             // a value even if it wasn't found - so that the field exists
        //             var persistableValue;
        //             if (wasFound == true) {
        //                 if (isSingular) {
        //                     persistableValue = matchingForeignValues ? (matchingForeignValues.length > 0 ? matchingForeignValues[0] : null) : null;
        //                 } else {
        //                     persistableValue = matchingForeignValues;
        //                 }
        //             } else {
        //                 persistableValue = null;
        //             }
        //             //
        //             var bulkOperationQueryFragment =
        //             {
        //                 pKey: ofTheseProcessedRowObjectDoc.pKey,
        //                 srcDocPKey: ofTheseProcessedRowObjectDoc.srcDocPKey
        //             };
        //             var updateFragment = {};
        //             updateFragment["$set"] = {};
        //             updateFragment["$set"]["rowParams." + generateFieldNamed] = persistableValue;
        //             // ^ Note that we're only updating a specific path, not the whole rowParams value

        //             bulkOperation_ofTheseProcessedRowObjects.find(bulkOperationQueryFragment).upsert().update(updateFragment);
        //         }
        //         //
        //         proceedToPersist();
        //     });
        // });
        // //
        // function proceedToPersist() {
        //     winston.info("📡  [" + (new Date()).toString() + "] Upserting processed rows for \"" + dataSource_title + "\" having generated fields named \"" + generateFieldNamed + "\".");
        //     job.log("📡  [" + (new Date()).toString() + "] Upserting processed rows for \"" + dataSource_title + "\" having generated fields named \"" + generateFieldNamed + "\".");
        //     //
        //     callback();
            // var writeConcern =
            // {
            //     // upsert: true,
            //     // note: we're turning this off as it's super slow for large datasets like Artworks
            //     // j: true // 'requests acknowledgement from MongoDB that the write operation has been written to the journal'
            // };
            // bulkOperation_ofTheseProcessedRowObjects.execute(writeConcern, function (err, result) {
            //     if (err) {
            //         console.log('time out here?');

            //         winston.error("❌ [" + (new Date()).toString() + "] Error while saving generated fields of processed row objects: ", err);

            //     } else {
            //         winston.info("✅  [" + (new Date()).toString() + "] Saved generated fields on processed row objects.");
            //         job.log("✅  [" + (new Date()).toString() + "] Saved generated fields on processed row objects.");
            //     }
            //     callback(err);
            // });
        // }
    });
};

module.exports.GenerateFieldsByJoining = function (dataSource_uid,
                                                   dataSource_importRevision,
                                                   dataSource_title,
                                                   generateFieldNamed,
                                                   isSingular,
                                                   findingMatchOnFields,
                                                   ofOtherRawSrcUID,
                                                   andOtherRawSrcImportRevision,
                                                   withLocalField,
                                                   obtainingValueFromField_orUndefined,
                                                   or_formingRelationship,
                                                   callback) {
    mongoose_client.WhenMongoDBConnected(function () { // ^ we block because we're going to work with the native connection; Mongoose doesn't block til connected for any but its own managed methods
        winston.info("🔁  Generating field \"" + generateFieldNamed
            + "\" of \"" + dataSource_title
            + "\" by joining on \"" + findingMatchOnFields
            + "\" of data source \"" + ofOtherRawSrcUID + "\" revision \"" + andOtherRawSrcImportRevision + "\".");

        var pKey_ofFromDataSourceDoc = raw_source_documents.NewCustomPrimaryKeyStringWithComponents(ofOtherRawSrcUID, andOtherRawSrcImportRevision);
        var pKey_ofDataSrcDocBeingProcessed = raw_source_documents.NewCustomPrimaryKeyStringWithComponents(dataSource_uid, dataSource_importRevision);
        //
        var mongooseContext_ofFromRawRowObjects = raw_row_objects.Lazy_Shared_RawRowObject_MongooseContext(pKey_ofFromDataSourceDoc);
        var mongooseModel_ofFromRawRowObjects = mongooseContext_ofFromRawRowObjects.forThisDataSource_RawRowObject_model;
        //
        var mongooseContext_ofRawRowObjectsBeingProcessed = raw_row_objects.Lazy_Shared_RawRowObject_MongooseContext(pKey_ofDataSrcDocBeingProcessed);
        var mongooseModel_ofRawRowObjectsBeingProcessed = mongooseContext_ofRawRowObjectsBeingProcessed.forThisDataSource_RawRowObject_model;
        //
        var mongooseContext_ofTheseProcessedRowObjects = _Lazy_Shared_ProcessedRowObject_MongooseContext(pKey_ofDataSrcDocBeingProcessed);
        var mongooseModel_ofTheseProcessedRowObjects = mongooseContext_ofTheseProcessedRowObjects.Model;
        var nativeCollection_ofTheseProcessedRowObjects = mongooseModel_ofTheseProcessedRowObjects.collection;
        //
        var bulkOperation_ofTheseProcessedRowObjects = nativeCollection_ofTheseProcessedRowObjects.initializeUnorderedBulkOp();
        var findingMatchOnFields_length = findingMatchOnFields.length;
        var getIdInsteadOfValueFromField = typeof obtainingValueFromField_orUndefined === 'undefined';
        //
        async.each(findingMatchOnFields, function (findingMatchOnField, eachCB) {
            var aggregationOperators = [{$unwind: "$" + "rowParams." + withLocalField}];
            var projectOperator = {$project: {pKey: 1, srcDocPKey: 1}};
            projectOperator['$project']['rowParams.' + withLocalField] = 1;
            aggregationOperators.push(projectOperator);
            aggregationOperators.push({
                    $lookup: {
                        from: mongooseContext_ofFromRawRowObjects.forThisDataSource_rowObjects_modelName.toLowerCase(),
                        as: 'fromProcessedRowObjectDoc',
                        localField: 'rowParams.' + withLocalField,
                        foreignField: 'rowParams.' + findingMatchOnField
                    }
                }
            );
            projectOperator = {$project: {pKey: 1, srcDocPKey: 1}};
            if (getIdInsteadOfValueFromField)
                projectOperator['$project']['fromProcessedRowObjectDoc._id'] = 1;
            else
                projectOperator['$project']['fromProcessedRowObjectDoc.rowParams.' + obtainingValueFromField_orUndefined] = 1;
            aggregationOperators.push(projectOperator);

            var counter = 0;
            var cursor = mongooseModel_ofRawRowObjectsBeingProcessed.collection.aggregate(aggregationOperators, {cursor: {batchSize: 100}});

            cursor.on('data', function (item) {
                if (counter != 0 && counter % 1000 == 0) {
                    console.log("" + counter + " of local '" + pKey_ofDataSrcDocBeingProcessed + "'  with foreign '" + pKey_ofFromDataSourceDoc + "'");
                }

                var foreignValueToExtract = item.fromProcessedRowObjectDoc;
                var persistableValue = null;
                if (isSingular) {
                    foreignValueToExtract = foreignValueToExtract ? foreignValueToExtract[0] : foreignValueToExtract;
                    if (getIdInsteadOfValueFromField)
                        persistableValue = foreignValueToExtract._id;
                    else if (foreignValueToExtract)
                        persistableValue = foreignValueToExtract.rowParams[obtainingValueFromField_orUndefined];
                } else if (foreignValueToExtract) {
                    persistableValue = [];
                    foreignValueToExtract.forEach(function (record) {
                        if (getIdInsteadOfValueFromField)
                            persistableValue.push(record._id);
                        else
                            persistableValue.push(record.rowParams[obtainingValueFromField_orUndefined]);
                    });
                }
                //
                var bulkOperationQueryFragment =
                {
                    pKey: item.pKey,
                    srcDocPKey: item.srcDocPKey
                };
                var updateFragment = {};
                updateFragment["$set"] = {};
                updateFragment["$set"]["rowParams." + generateFieldNamed] = persistableValue;
                // ^ Note that we're only updating a specific path, not the whole rowParams value
                bulkOperation_ofTheseProcessedRowObjects.find(bulkOperationQueryFragment).upsert().update(updateFragment);

                counter++;
            });
            cursor.on('end', function () {
                eachCB();
            });
        }, function (err) {
            if (err) {
                return callback(err, null);
            }
            proceedToPersist();
        });
        //
        function proceedToPersist() {
            winston.info("📡  [" + (new Date()).toString() + "] Upserting processed rows for \"" + dataSource_title + "\" having generated fields named \"" + generateFieldNamed + "\".");
            //
            var writeConcern =
            {
                upsert: true
                // note: we're turning this off as it's super slow for large datasets like Artworks
                // j: true // 'requests acknowledgement from MongoDB that the write operation has been written to the journal'
            };
            bulkOperation_ofTheseProcessedRowObjects.execute(writeConcern, function (err, result) {
                if (err) {
                    winston.error("❌ [" + (new Date()).toString() + "] Error while saving generated fields of processed row objects: ", err);
                } else {
                    winston.info("✅  [" + (new Date()).toString() + "] Saved generated fields on processed row objects.");
                }
                callback(err);
            });
        }
    });
};

module.exports.GenerateFieldsByJoining_comparingWithMatchRegex = function (dataSource_uid,
                                                                           dataSource_importRevision,
                                                                           dataSource_title,
                                                                           generateFieldNamed,
                                                                           isSingular,
                                                                           findingMatchOnFields,
                                                                           ofOtherRawSrcUID,
                                                                           andOtherRawSrcImportRevision,
                                                                           withLocalField,
                                                                           obtainingValueFromField_orUndefined,
                                                                           or_formingRelationship,
                                                                           doesFieldMatch_regex,
                                                                           callback) {
    if (typeof obtainingValueFromField_orUndefined === 'undefined') {
        if (or_formingRelationship == false) {
            var errorString = "Generate Join parameter configuration conflict: obtainingValueFromField was undefined as " + obtainingValueFromField_orUndefined + " but relationship=true";
            var err = new Error(errorString);
            winston.error("❌  Error while generating field by join:", err);
            return callback(err);
        }
    } else {
        if (or_formingRelationship == true) {
            var errorString = "Generate Join parameter configuration conflict: obtainingValueFromField was not undefined as " + obtainingValueFromField_orUndefined + " but relationship=false";
            var err = new Error(errorString);
            winston.error("❌  Error while generating field by join:", err);
            return callback(err);
        }
    }

    mongoose_client.WhenMongoDBConnected(function () { // ^ we block because we're going to work with the native connection; Mongoose doesn't block til connected for any but its own managed methods
        winston.info("🔁  Generating field \"" + generateFieldNamed
            + "\" of \"" + dataSource_title
            + "\" by joining on \"" + findingMatchOnFields
            + "\" of data source \"" + ofOtherRawSrcUID + "\" revision \"" + andOtherRawSrcImportRevision + "\".");

        var pKey_ofFromDataSourceDoc = raw_source_documents.NewCustomPrimaryKeyStringWithComponents(ofOtherRawSrcUID, andOtherRawSrcImportRevision);
        var pKey_ofDataSrcDocBeingProcessed = raw_source_documents.NewCustomPrimaryKeyStringWithComponents(dataSource_uid, dataSource_importRevision);
        //
        var mongooseContext_ofFromRawRowObjects = raw_row_objects.Lazy_Shared_RawRowObject_MongooseContext(pKey_ofFromDataSourceDoc);
        var mongooseModel_ofFromRawRowObjects = mongooseContext_ofFromRawRowObjects.forThisDataSource_RawRowObject_model;
        //
        var mongooseContext_ofRawRowObjectsBeingProcessed = raw_row_objects.Lazy_Shared_RawRowObject_MongooseContext(pKey_ofDataSrcDocBeingProcessed);
        var mongooseModel_ofRawRowObjectsBeingProcessed = mongooseContext_ofRawRowObjectsBeingProcessed.forThisDataSource_RawRowObject_model;
        //
        var mongooseContext_ofTheseProcessedRowObjects = _Lazy_Shared_ProcessedRowObject_MongooseContext(pKey_ofDataSrcDocBeingProcessed);
        var mongooseModel_ofTheseProcessedRowObjects = mongooseContext_ofTheseProcessedRowObjects.Model;
        var nativeCollection_ofTheseProcessedRowObjects = mongooseModel_ofTheseProcessedRowObjects.collection;
        //
        var bulkOperation_ofTheseProcessedRowObjects = nativeCollection_ofTheseProcessedRowObjects.initializeUnorderedBulkOp();
        var findingMatchOnFields_length = findingMatchOnFields.length;
        var getIdInsteadOfValueFromField = typeof obtainingValueFromField_orUndefined === 'undefined';
        //
        mongooseModel_ofRawRowObjectsBeingProcessed.find({}, function (err, ofTheseProcessedRowObjectDocs) {
            if (err) {
                winston.error("❌  Error while generating field by reverse-join:", err);
                callback(err);

                return;
            }

            var countOfTheseProcessedRowObjectDocs = 0;
            for (var i = 0; i < ofTheseProcessedRowObjectDocs.length; i++) {
                var ofTheseProcessedRowObjectDoc = ofTheseProcessedRowObjectDocs[i];
                var localFieldValue = ofTheseProcessedRowObjectDoc.rowParams["" + withLocalField];

                var matchConditions = [];
                for (var j = 0; j < findingMatchOnFields_length; j++) {
                    var matchOnField = findingMatchOnFields[j];
                    var condition = {};
                    condition["rowParams." + matchOnField] = doesFieldMatch_regex(localFieldValue);
                    matchConditions.push(condition);
                }

                var foreignValueToExtract = {};
                if (getIdInsteadOfValueFromField == true) {
                    foreignValueToExtract["_id"] = 1;
                } else {
                    foreignValueToExtract["rowParams." + obtainingValueFromField_orUndefined] = 1;
                }

                mongooseModel_ofFromRawRowObjects.find({
                    $or: matchConditions
                }, foreignValueToExtract, function (err, matchingForeignValues) {
                    if (err) {
                        winston.error("❌  Error while generating field by join:", err);
                        return callback(err);
                    }

                    if (countOfTheseProcessedRowObjectDocs != 0 && countOfTheseProcessedRowObjectDocs % 1000 == 0) {
                        console.log("" + countOfTheseProcessedRowObjectDocs + " / " + ofTheseProcessedRowObjectDocs.length + " of local '" + pKey_ofDataSrcDocBeingProcessed + "' with foreign '" + pKey_ofFromDataSourceDoc + "'");
                    }

                    var persistableValue;
                    if (matchingForeignValues && matchingForeignValues.length > 0) {
                        if (isSingular) {
                            persistableValue = getIdInsteadOfValueFromField ?
                                matchingForeignValues[0]._doc._id : matchingForeignValues[0]._doc.rowParams[obtainingValueFromField_orUndefined];
                        } else {
                            persistableValue = matchingForeignValues.map(function (el) {
                                if (getIdInsteadOfValueFromField == true) {
                                    return el["_id"];
                                } else {
                                    return el["rowParams." + obtainingValueFromField_orUndefined];
                                }
                            });
                        }
                    } else {
                        persistableValue = null;
                    }
                    //
                    var bulkOperationQueryFragment =
                    {
                        pKey: ofTheseProcessedRowObjectDocs[countOfTheseProcessedRowObjectDocs].pKey,
                        srcDocPKey: ofTheseProcessedRowObjectDocs[countOfTheseProcessedRowObjectDocs].srcDocPKey
                    };
                    var updateFragment = {};
                    updateFragment["$set"] = {};
                    updateFragment["$set"]["rowParams." + generateFieldNamed] = persistableValue;
                    // ^ Note that we're only updating a specific path, not the whole rowParams value
                    bulkOperation_ofTheseProcessedRowObjects.find(bulkOperationQueryFragment).upsert().update(updateFragment);
                    countOfTheseProcessedRowObjectDocs++;
                    //
                    if (countOfTheseProcessedRowObjectDocs == ofTheseProcessedRowObjectDocs.length) proceedToPersist();
                });

            }
        });
        //
        function proceedToPersist() {
            winston.info("📡  [" + (new Date()).toString() + "] Upserting processed rows for \"" + dataSource_title + "\" having generated fields named \"" + generateFieldNamed + "\".");
            //
            var writeConcern =
            {
                upsert: true
                // note: we're turning this off as it's super slow for large datasets like Artworks
                // j: true // 'requests acknowledgement from MongoDB that the write operation has been written to the journal'
            };
            bulkOperation_ofTheseProcessedRowObjects.execute(writeConcern, function (err, result) {
                if (err) {
                    winston.error("❌ [" + (new Date()).toString() + "] Error while saving generated fields of processed row objects: ", err);
                } else {
                    winston.info("✅  [" + (new Date()).toString() + "] Saved generated fields on processed row objects.");
                }
                callback(err);
            });
        }
    });
};

module.exports.EnumerateProcessedDataset = function (dataSource_uid,
                                                     dataSource_importRevision,
                                                     dataset_uid,
                                                     eachFn,
                                                     errFn,
                                                     completeFn,
                                                     query_optl) {
    // eachFn: (doc, cb) -> Void ……… call cb(null_optl) when done with doc
    // errFn: (err) -> Void
    // completeFn: () -> Void
    mongoose_client.WhenMongoDBConnected(function () { // ^ we block because we're going to work with the native connection; Mongoose doesn't block til connected for any but its own managed methods

        var pKey_ofDataSrcDocBeingProcessed = raw_source_documents.NewCustomPrimaryKeyStringWithComponents(dataSource_uid, dataSource_importRevision);
        //
        var mongooseContext_ofTheseProcessedRowObjects = _Lazy_Shared_ProcessedRowObject_MongooseContext(pKey_ofDataSrcDocBeingProcessed);
        var mongooseModel_ofTheseProcessedRowObjects = mongooseContext_ofTheseProcessedRowObjects.Model;
        var nativeCollection_ofTheseProcessedRowObjects = mongooseModel_ofTheseProcessedRowObjects.collection;
        //
        var hasErroredAndReturned = false;
        var hasReachedEndOfCursor = false;
        var numberOfDocumentsFoundButNotYetProcessed = 0;
        var numDocs = 0;
        //

        var query = {};
        if (dataset_uid && typeof dataset_uid === 'string' && dataset_uid != '') {
            query = {pKey: {$regex: "^" + dataset_uid + "-"}};
        }
        if (query_optl == null || typeof query_optl === 'undefined') {
            query = {};
        } else {
            for (var opt in query_optl) {
                query[opt] = query_optl[opt];
            }
        }

        // console.log(query);

        nativeCollection_ofTheseProcessedRowObjects.find(query, {sort: {_id: 1}}, function (err, cursor) {
            if (err) { // No cursor yet so we do not call closeCursorAndReturnWithErr(err)
                hasErroredAndReturned = true;
                errFn(err);

                return;
            }
            function closeCursorAndReturnWithErr(err) {
                hasErroredAndReturned = true;
                cursor.close(function (closeErr, result) {
                    if (closeErr != null) {
                        winston.warn("⚠️  Error has occurred on cursor close after err returned from each doc:", closeErr);
                    }
                    errFn(err);
                });
            }

            cursor.each(function (err, doc) {
                // console.log(doc);
                if (hasErroredAndReturned == true) {
                    winston.warn("⚠️  Each called after hasErroredAndReturned.");

                    return;
                }
                if (err) {
                    closeCursorAndReturnWithErr(err);

                    return;
                }
                if (doc === null) { // then we're finished
                    hasReachedEndOfCursor = true;
                    if (numberOfDocumentsFoundButNotYetProcessed == 0) { // in case we've already finished, i.e. if the operation we did with the docs was sync and not async
                        completeFn();
                    }

                    return;
                }
                //
                numberOfDocumentsFoundButNotYetProcessed += 1;
                numDocs += 1;
                //
                function _finishedWithDoc() {
                    numberOfDocumentsFoundButNotYetProcessed -= 1; // finished with this doc - decrement
                    //


                    if (hasReachedEndOfCursor == true) {
                        if (numberOfDocumentsFoundButNotYetProcessed == 0) {
                            // console.log("Reached end of cursor and finished processing all")
                            completeFn();
                        } else {
                            // console.log("Reached end of cursor but not finished processing all")
                        }
                    } else {
                        // console.log("Hasn't reached end of cursor")
                    }
                }

                //
                eachFn(doc, function (err) {
                    if (err != null && typeof err !== 'undefined') {
                        closeCursorAndReturnWithErr(err);
                    }
                    _finishedWithDoc();
                });
            });
        });
    });
};

//
var xray = require('x-ray');
var xray_instance = xray();

var image_hosting = require('../libs/utils/aws-image-hosting');


function _nextLargestImageSrcSetSizeAvailableInParsedRawURLsBySize(rawURLsBySize, afterSize) // -> (String?)
{

    var sizes = Object.keys(rawURLsBySize);
    var sizes_length = sizes.length;
    if (sizes_length == 0) {
        throw new Error("Unexpected 0 length rawURLsBySize.");
        return null; // just in case
    }
    var afterSizeString_asInt = afterSize

     // __intSizeFromSrcSetSizeString(afterSize);
    var latestBiggestSizeString = null;
    var latestBiggestSizeAsInt = -1;
    for (var i = 0; i < sizes_length; i++) {
        var key = sizes[i]; // key will never be afterSize
        if (key !== afterSize) { // but just in case...
            var keySizeAsInt = __intSizeFromSrcSetSizeString(key);
            if (latestBiggestSizeString == null || latestBiggestSizeAsInt < keySizeAsInt) {
                latestBiggestSizeString = key;
                latestBiggestSizeAsInt = keySizeAsInt;
            }
        }
    }

    return latestBiggestSizeString;
}

function __intSizeFromSrcSetSizeString(sizeString) {
    var stringWithoutLastChar = sizeString.substring(0, sizeString.length - 1); // to strip off the 'w'
    var asInt = parseInt(stringWithoutLastChar);

    return asInt;
}


function _constructorSelector(setFieldsArray) {
    var elements = {};
    for (var i = 0; i < setFieldsArray.length; i++) {
        elements[setFieldsArray[i].newFieldName] = setFieldsArray[i].selector;
    }
    return elements;

}

function _findFieldFromSetFieldsArray(setFieldsArray, name) {
    var index = -1;
    for (var i = 0; i < setFieldsArray.length; i++) {
        if (setFieldsArray[i].newFieldName == name) {
            return i;
        }
    }
    return index;
}

function extractRawUrl(scrapedString) {

    var urlsAndSizes = scrapedString.split(', ');
    var rawURLsBySize = {}; // now to construct this
    var urlsAndSizes_length = urlsAndSizes.length;
    if (urlsAndSizes_length == 0) {
        winston.error("❌  urlsAndSizes_length was 0.");
        return null;// nothing to do
    }

    for (var i = 0; i < urlsAndSizes_length; i++) {
        var urlAndSizeString = urlsAndSizes[i];
        var components = urlAndSizeString.split(' ');


        var rawURL, size;
        //image instead of srcset
        if (components.length == 1) {
            var sp = components[0].split(",");
            if (typeof sp[2] == 'undefined') {
                size = "OneSize";
            } else {
                size = components[0].split(",")[2] + "w";
            }


        } else {
            size = components[1];
        }


        rawURL = components[0];


        size = size;
        rawURLsBySize[size] = rawURL;
    }


    return rawURLsBySize;

}

function scrapeImages(job,folder,mongooseModel, doc, htmlSourceAtURLInField, setFields, selectors, outterCallback) {
    var htmlSourceAtURL = doc["rowParams"][htmlSourceAtURLInField];

    winston.info("📡  Scraping image URL from \"" + htmlSourceAtURL + "\"…");
    job.log("📡  Scraping image URL from \"" + htmlSourceAtURL + "\"…");

    var returnObj = {};

    var stillNeedScrape = false;

    for (var field in selectors) {

        if (typeof selectors[field] == 'undefined' || selectors[field] == '') {
            returnObj[field] = {};
            returnObj[field]["OneSize"] = htmlSourceAtURL;
            continue;
        }
        stillNeedScrape = true
    }


    if (stillNeedScrape == false) {

        outterCallback(null, job,folder,mongooseModel, doc, returnObj, setFields);
        return;
    }


    xray_instance(htmlSourceAtURL, selectors)(function (err, scrapedObject) {
        if (err !== null || scrapedObject == null || Object.keys(scrapedObject).length == 0) {

            if ( (err && (err.code == "ENOTFOUND" || err.code == 'ETIMEDOUT' || err.code == 'ECONNRESET')) || scrapedObject == null || 
                typeof scrapedObject == 'undefined' || (typeof scrapedObject == 'object' && Object.keys(scrapedObject).length == 0)) {
                for (var attr in selectors) {
                    returnObj[attr] = null;
                }
                return outterCallback(err,job,folder,mongooseModel,doc, returnObj,setFields);
            } else {
                winston.error("❌  Error while scraping " + htmlSourceAtURL + ": ", err);
                return outterCallback(err, job,null,null,null,null,null);
            }

        } 


        async.eachOf(scrapedObject, function (scrapedString, newField, innerCallback) {

            if (scrapedString == null || typeof scrapedString == "undefined" || scrapedString == '') {
                winston.info("💬  No images available for " + doc.srcDocPKey + " row with pKey " + doc.pKey + ". Saving nulls in image field:" + newField + ".");
                returnObj[newField] = null;
                innerCallback(null);
            } else {
                var rawUrlBySize = extractRawUrl(scrapedString);
                if (rawUrlBySize == null) {
                    innerCallback(new Error("❌ cannot extract url by size"));
                } else {
                    returnObj[newField] = rawUrlBySize;
                    innerCallback(null);

                }


            }

        }, function (err) {



            return outterCallback(err, job,folder,mongooseModel, doc, returnObj, setFields);
        })
    })
}


function proceedToPersistHostedImageURLOrNull_forKey(err, job,mongooseModel, docQuery, hostedURLOrNull, fieldKey, lastFieldKey, persistedCb) {
    if (err) {
        persistedCb(err);
        return;
    }
    if (hostedURLOrNull != null) {
        var hostedURLChunks = hostedURLOrNull.split('.')
        var hostedFileExtension = hostedURLChunks[hostedURLChunks.length - 1];    
    }

    var docUpdate = {};
    if (lastFieldKey == true) {
        docUpdate["rowParams.imageScraped"] = true
    }
    var relativeURLPortion = hostedURLOrNull == null? null : docQuery.srcDocPKey + "/" + docQuery.pKey + '__' + fieldKey + "." + hostedFileExtension;
    docUpdate["rowParams." + fieldKey] = relativeURLPortion; // save the relative path
    mongooseModel.update(docQuery, {$set: docUpdate}, function (err, result) {
        winston.info("📝  Saved " + hostedURLOrNull + " as " + relativeURLPortion + " at " + fieldKey);
        job.log("📝  Saved " + hostedURLOrNull + " as " + relativeURLPortion + " at " + fieldKey);
        persistedCb(err);
    });
}


function updateDocWithImageUrl(job,folder,mongooseModel, doc, scrapedObject, setFields, outterCallback) {


    var docQuery = {
        pKey: doc.pKey,
        srcDocPKey: doc.srcDocPKey
    }
    var docUpdate = {};
    var counter = 0;

    var keyLength = Object.keys(scrapedObject).length;
    var index;

    async.eachOf(scrapedObject, function (value, key, eachCb) {
        counter++;

        index = _findFieldFromSetFieldsArray(setFields, key);
        var sizeForFieldKey;
        if (setFields[index].size) {
            sizeForFieldKey = setFields[index].size + 'w';
        } else {
            sizeForFieldKey = undefined;
        }

        var rawURLForSize;

        if (value == null) {

            var last = false;
            if (counter == keyLength) {
                last = true;
            }

            winston.warn("⚠️  scraped object is undefined for this doc:" + JSON.stringify(docQuery) + "]");
            proceedToPersistHostedImageURLOrNull_forKey(null, job,mongooseModel, docQuery, null, key, last, function (err) {
                eachCb(err);
            })


        } else if (typeof sizeForFieldKey == 'undefined') {
            //get the first size
            for (var size in value) {
                rawURLForSize = value[size];
                break;
            }
            // only suitable for image has no size specified, not srcset
            if (setFields[index].splitAt) {

                rawURLForSize = rawURLForSize.split(setFields[index].splitAt)[0] + setFields[index].fabricatedSuffix;
            }


            var finalized_imageSourceURLForSize = setFields[index].prependToImageURLs + rawURLForSize;

            var hostingOpts = {
                overwrite: true
            }
            var destinationFilenameSansExt = doc.srcDocPKey + "/" + doc.pKey + "__" + key;
            var resize = setFields[index].resize;

            // winston.info("🔁  Download/host and store hosted url for original " + finalized_imageSourceURLForSize)

            image_hosting.hostImageLocatedAtRemoteURL(folder,resize, finalized_imageSourceURLForSize, destinationFilenameSansExt, hostingOpts, function (err, hostedUrl) {
                if (err) {
                    eachCb(err);
                } else {
                    var last = false;
                    if (counter == keyLength) {
                        last = true;
                    }
                    proceedToPersistHostedImageURLOrNull_forKey(null, job,mongooseModel, docQuery, hostedUrl, key, last, function (err) {
                        eachCb(err);
                    })
                }
            });


        } else {


            rawURLForSize = value[sizeForFieldKey];

            if (rawURLForSize == null || typeof rawURLForSize == 'undefined') {
                var nextLargestSize = _nextLargestImageSrcSetSizeAvailableInParsedRawURLsBySize(value, sizeForFieldKey);

                if (nextLargestSize == null) {
                    // still no available images (although this will actually throw)
                    var err = new Error("No available URL for size " + sizeForFieldKey + " nor any next largest size available in scraped image src set " + JSON.stringify(value) + " for", JSON.stringify(doc));
                    eachCb(err);
                }
                winston.warn("⚠️  No available URL for size " + sizeForFieldKey + " in scraped image src set " + JSON.stringify(value) + ". Located next largest size " + nextLargestSize + "…");
                rawURLForSize = value[nextLargestSize]; // re-pick next largest
                if (rawURLForSize == null || typeof rawURLForSize === 'undefined') { // still
                    var err = new Error("Picked next largest size but unexpectedly no URL available for it in src set " + JSON.stringify(value) + " for", JSON.stringify(doc));
                    eachCb(err);

                }
            }

            var finalized_imageSourceURLForSize = setFields[index].prependToImageURLs + rawURLForSize;

            var hostingOpts = {
                overwrite: true
            }
            var destinationFilenameSansExt = doc.srcDocPKey + "/" + doc.pKey + "__" + key;
            winston.info("🔁  Download/host and store hosted url for original " + finalized_imageSourceURLForSize)


            var resize = setFields[index].resize;

            image_hosting.hostImageLocatedAtRemoteURL(folder,resize, finalized_imageSourceURLForSize, destinationFilenameSansExt, hostingOpts, function (err, hostedUrl) {
                if (err) {
                    eachCb(err);
                } else {
                    var last = false;
                    if (counter == keyLength) {
                        last = true;
                    }
                    proceedToPersistHostedImageURLOrNull_forKey(err, job,mongooseModel, docQuery, hostedUrl, key, last, function (err) {
                        eachCb(err);
                    })
                }
            });
        }
    }, function (err) {
        outterCallback(err);
    })

}


module.exports.GenerateImageURLFieldsByScraping
    = function (job,dataSource_team_subdomain,dataSource_uid,
                dataSource_importRevision,
                dataSource_title,
                dataset_uid,
                htmlSourceAtURLInField,
                setFields,
                callback) {
    // var useAndHostSrcSetSizeByField_keys = Object.keys(useAndHostSrcSetSizeByField);
    //

    mongoose_client.WhenMongoDBConnected(function () { // ^ we block because we're going to work with the native connection; Mongoose doesn't block til connected for any but its own managed methods
        winston.info("🔁  Generating fields by scraping images for \"" + dataSource_title + "\".");
        //
        var pKey_ofDataSrcDocBeingProcessed = raw_source_documents.NewCustomPrimaryKeyStringWithComponents(dataSource_uid, dataSource_importRevision);
        //
        var mongooseContext = _Lazy_Shared_ProcessedRowObject_MongooseContext(pKey_ofDataSrcDocBeingProcessed);
        var mongooseModel = mongooseContext.Model;

        var datasetQuery = {};
        if (dataset_uid) {
            datasetQuery["pKey"] = {$regex: "^" + dataset_uid + "-"}
        }

        datasetQuery["rowParams." + htmlSourceAtURLInField] = {$exists: true};
        datasetQuery["rowParams." + htmlSourceAtURLInField] = {$ne: ""};

        // datasetQuery["rowParams.Artist"] = "Le Corbusier (Charles-Édouard Jeanneret), Pierre Jeanneret";

        var folder =  dataSource_team_subdomain + '/datasets/' + dataSource_uid + '/assets/images/';


        mongooseModel.find(datasetQuery, function (err, docs) { // this returns all docs in memory but at least it's simple to iterate them synchronously
            // var concurrencyLimit = 80; // at a time

            var selectors = _constructorSelector(setFields);

            var N = 30; //concurrency limit

            var q = async.queue(function(task,callback) {

                var doc = task.doc;
                if (typeof doc["rowParams"]["imageScraped"] !== 'undefined' && doc["rowParams"]["imageScraped"] == true) {

                    winston.info("📡  already scraped this ,skipping");

                    callback();

                } else {
                   
                    async.waterfall(
                        [async.apply(scrapeImages, job,folder,mongooseModel, doc, htmlSourceAtURLInField, setFields, selectors),
                            updateDocWithImageUrl
                        ], function (err) {
                            if (err && err.code !== 'ENOTFOUND'  &&  err.code !== 'ETIMEDOUT' && err.code !== 'ECONNRESET') {
                                callback(err);
                            } else {
                                callback();
                            }
                        })
                }

            },N);


            q.drain = function() {
                winston.info("📡  all items are processed for scraping, successfully scraped all of the images ");
                 mongooseModel.update(datasetQuery, {$unset: {"rowParams.imageScraped": 1}}, {multi: true}, function (err) {
                    if (err) winston.error("❌ Error while deleting rowParams.imageScraped : ", err);
                    return callback(err);
                })
            }


            for (var i = 0; i < docs.length; i++) {
                q.push({doc: docs[i]},function(err) {
                    if (err) {
                        return callback(err);
                    }
                })
            }

        });
    });
};

// fn: (err, [Schema.Types.ObjectId])
module.exports.RemoveRows = function (description, fn) {
    var pKeyPrefix = description.dataset_uid;
    var pKey_ofDataSrcDocBeingProcessed = raw_source_documents.NewCustomPrimaryKeyStringWithComponents(description.uid, description.importRevision);

    winston.info("📡  [" + (new Date()).toString() + "] Deleting processed rows for \"" + description.title + "\".");

    var mongooseContext_ofTheseProcessedRowObjects = _Lazy_Shared_ProcessedRowObject_MongooseContext(pKey_ofDataSrcDocBeingProcessed);
    var mongooseModel_ofTheseProcessedRowObjects = mongooseContext_ofTheseProcessedRowObjects.Model;
    var nativeCollection_ofTheseProcessedRowObjects = mongooseModel_ofTheseProcessedRowObjects.collection;
    //
    var query =
    {
        srcDocPKey: pKey_ofDataSrcDocBeingProcessed
    };
    if (pKeyPrefix) query.pKeyPrefix = {
        $regex: "^" + pKeyPrefix + "-",
        $options: 'i'
    }

    nativeCollection_ofTheseProcessedRowObjects.find(query).remove().exec(function (err) {
        if (err) {
            winston.error("❌ [" + (new Date()).toString() + "] Error while removing raw row objects: ", err);
        } else {
            winston.info("✅  [" + (new Date()).toString() + "] Removed raw row objects.");
        }
        fn(err);
    });
};