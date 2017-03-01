var async = require('async');
var winston = require('winston');
var raw_source_documents = require('./raw_source_documents');
var raw_row_objects = require('./raw_row_objects');
var mongoose_client = require('./mongoose_client');

var processing = require('../libs/datasources/processing');
var mongoose = mongoose_client.mongoose;
var Schema = mongoose.Schema;

var New_RowObjectsModelName = function (objectId) {
    return 'ProcessedRowObjects-' + objectId;
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


var _Lazy_Shared_ProcessedRowObject_MongooseContext = function (objectId) {


    var mongooseContext = MongooseContextsBySrcDocPKey[objectId];
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
    var ModelName = New_RowObjectsModelName(objectId);
    var Model = mongoose.model(ModelName, Scheme,ModelName.toLowerCase());
    //
    mongooseContext =
    {
        Scheme: Scheme,
        ModelName: ModelName,
        Model: Model
    };
    MongooseContextsBySrcDocPKey[objectId] = mongooseContext;

    return mongooseContext;
};

module.exports.Lazy_Shared_ProcessedRowObject_MongooseContext = _Lazy_Shared_ProcessedRowObject_MongooseContext;


module.exports.initializeBackgroundIndexBuilding = function(description) {

    if (!description.relationshipFields || description.relationshipFields.length == 0) {
        return;
    }


    var mongooseContext_ofTheseProcessedRowObjects = _Lazy_Shared_ProcessedRowObject_MongooseContext(description._id).Model.collection;

    for (var i = 0; i < description.relationshipFields.length; i++) {
        var buildField = description.relationshipFields[i].by.withLocalField;
        var createIndexQuery = {};
        createIndexQuery["rowParams." + buildField] = 1;
        mongooseContext_ofTheseProcessedRowObjects.createIndex(createIndexQuery, {background: true})

        winston.info("🔁  initialize index building for field: " + buildField);
    }

}


module.exports.InsertProcessedDatasetFromRawRowObjects = function (job,dataset_id,
                                                                   parentId,
                                                                   callback) {
    mongoose_client.WhenMongoDBConnected(function () { // ^ we block because we're going to work with the native connection; Mongoose doesn't block til connected for any but its own managed methods
        winston.info("🔁  Pre-generating whole processed row objects collection from raw row objects of \"" + dataset_id + "\".");


        var insertTo = parentId || dataset_id

        var mongooseContext_ofRawRowObjectsBeingProcessed = raw_row_objects.Lazy_Shared_RawRowObject_MongooseContext(insertTo);
        var mongooseModel_ofRawRowObjectsBeingProcessed = mongooseContext_ofRawRowObjectsBeingProcessed.forThisDataSource_RawRowObject_model;
        //
        var mongooseContext_ofTheseProcessedRowObjects = _Lazy_Shared_ProcessedRowObject_MongooseContext(insertTo);
        var mongooseModel_ofTheseProcessedRowObjects = mongooseContext_ofTheseProcessedRowObjects.Model;
        var nativeCollection_ofTheseProcessedRowObjects = mongooseModel_ofTheseProcessedRowObjects.collection;

        var updateDocs = [];

        var datasetQuery = parentId ? {pKey: {$regex: "^" + dataset_id + "-"}} : {pKey: {$regex: /^\d+$/ }};


        var cursor = mongooseModel_ofRawRowObjectsBeingProcessed.find(datasetQuery).cursor()
        var count = 0;
        var error = null;

        cursor.on('data', function (doc) {

            count += 1;

            nativeCollection_ofTheseProcessedRowObjects.insertOne(doc._doc, {ordered: false}, function (err) {
                if (err) {
                   
                    
                    winston.error("❌ [" + (new Date()).toString() + "] Error from line 121 while saving processed row objects: ", JSON.stringify(err));
                    
                    error = err;
                    
                } 
            })
          
            if (count % 1000 == 0 && count !== 0) {
                winston.info("✅  parsed " + count + " of the row object documents  for \"" + insertTo + "\"." );
                job.log("✅  parsed " + count + " of the row object documents  for \"" + insertTo + "\".");
            }
          
        }).on('error', function (err) {

            winston.error("❌ error with cursor" + err);

            return callback(err)

        }).on('end', function () {


            winston.info("✅  [" + (new Date()).toString() + "] Saved collection of processed row objects. Used " + process.memoryUsage().heapUsed + " heap memory. Inserted " + count + " processed rows for\"" + dataset_id + "\".");
            job.log("✅  [" + (new Date()).toString() + "] Saved collection of processed row objects.")
    
            return callback(error)

        })        
    });
};

module.exports.GenerateProcessedDatasetFromRawRowObjects = function (dataSource_team_subdomain,dataSource_uid,
                                                                     dataSource_importRevision,
                                                                     dataSource_title,
                                                                     callback) {
    mongoose_client.WhenMongoDBConnected(function () { // ^ we block because we're going to work with the native connection; Mongoose doesn't block til connected for any but its own managed methods
        winston.info("🔁  Pre-generating whole processed row objects collection from raw row objects of \"" + dataSource_title + "\".");

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

module.exports.GenerateFieldsByJoining_comparingWithMatchFn = function (job,datasetId,
                                                                        generateFieldNamed,
                                                                        isSingular,
                                                                        findingMatchOnField,
                                                                        joinDatasetId,
                                                                        withLocalField,
                                                                        obtainingValueFromField_orUndefined,
                                                                        or_formingRelationship,
                                                                        /*doesFieldMatch_fn, */
                                                                        callback) {
    mongoose_client.WhenMongoDBConnected(function () { // ^ we block because we're going to work with the native connection; Mongoose doesn't block til connected for any but its own managed methods
        winston.info("🔁  Generating field \"" + generateFieldNamed
            + "\" of \"" + datasetId
            + "\" by joining on \"" + findingMatchOnField
            + "\" of data source \"" + joinDatasetId + "\".");

        
    
        var mongooseContext_ofTheseProcessedRowObjects = _Lazy_Shared_ProcessedRowObject_MongooseContext(datasetId);
        var mongooseModel_ofTheseProcessedRowObjects = mongooseContext_ofTheseProcessedRowObjects.Model;
        var nativeCollection_ofTheseProcessedRowObjects = mongooseModel_ofTheseProcessedRowObjects.collection;

        // var bulkOperation_ofTheseProcessedRowObjects = nativeCollection_ofTheseProcessedRowObjects.initializeUnorderedBulkOp();


        var unwindQuery =  {
          $unwind: '$' + "rowParams." + withLocalField
        };


        var groupQuery = {$group:{}};
        groupQuery.$group["_id"] = "$rowParams." + withLocalField


        var select = {};
        select["_id"] = 1;
        select["rowParams." + findingMatchOnField] = 1;
        var storingReference = true;

        if (isSingular ||  typeof obtainingValueFromField_orUndefined !== 'undefined') {
            select["rowParams." + obtainingValueFromField_orUndefined] = 1;
            storingReference = false;
        } 

        var cursor = _Lazy_Shared_ProcessedRowObject_MongooseContext(joinDatasetId).Model.find({})
        .select(select).cursor();

        var count = 0;

        cursor.on('data', function (doc) {

            count += 1;

            var findMatch = {};

            if (Array.isArray(doc.rowParams[findingMatchOnField])) {
                findMatch["rowParams." + withLocalField] = {$in : doc.rowParams[findingMatchOnField]}
            } else {
                findMatch["rowParams." + withLocalField] =  doc.rowParams[findingMatchOnField]
            }

            var updateQuery = {$set:{}};


            if (!storingReference) {
                updateQuery.$set["rowParams." + generateFieldNamed] = doc.rowParams[obtainingValueFromField_orUndefined];
            } else {
                updateQuery = {$addToSet: {}};
                updateQuery.$addToSet["rowParams."+ generateFieldNamed] = doc["_id"]; 
            }



            nativeCollection_ofTheseProcessedRowObjects.update(findMatch,updateQuery,{multi:true});


            if (count !== 0 && count % 1000 == 0) {

                winston.info("✅  processed " + count + " records of the joined field " + generateFieldNamed);
                job.log("✅  processed " + count + " records of the joined field " + generateFieldNamed);
            }
          
        }).on('error', function (err) {

            winston.error("❌  Error while generating field by reverse-join iterating with cursor :", err);
            return callback(err)

        }).on('end', function () {


            if (count % 1000 !== 0) {


                winston.info("✅  processed " + count  + " records of the joined field " + generateFieldNamed);
                job.log("✅  processed " + count+ " records of the joined field " + generateFieldNamed);
            }
          
            
            var setToNull = {};
            setToNull["rowParams." + generateFieldNamed] = {$exists: false}
            var setTo = {$set:{}};
            setTo.$set["rowParams."+ generateFieldNamed] = null;

            nativeCollection_ofTheseProcessedRowObjects.update(setToNull,setTo,{multi:true},function(err) {
                if (err) {
                    winston.error("❌ [" + (new Date()).toString() + "] Error while saving generated fields of processed row objects: ", err);
                    process.nextTick(function() {callback(err);})
                } else {
                    winston.info("✅  [" + (new Date()).toString() + "] Saved all generated fields \"" + generateFieldNamed + "\" on processed row objects");
                    job.log("✅  [" + (new Date()).toString() + "] Saved all generated fields \"" + generateFieldNamed + "\" on processed row objects.");
                    process.nextTick(function() {callback(err);})
                }
            })


        })
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

// module.exports.GenerateFieldsByJoining_comparingWithMatchRegex = function (dataSource_uid,
//                                                                            dataSource_importRevision,
//                                                                            dataSource_title,
//                                                                            generateFieldNamed,
//                                                                            isSingular,
//                                                                            findingMatchOnFields,
//                                                                            ofOtherRawSrcUID,
//                                                                            andOtherRawSrcImportRevision,
//                                                                            withLocalField,
//                                                                            obtainingValueFromField_orUndefined,
//                                                                            or_formingRelationship,
//                                                                            doesFieldMatch_regex,
//                                                                            callback) {
//     if (typeof obtainingValueFromField_orUndefined === 'undefined') {
//         if (or_formingRelationship == false) {
//             var errorString = "Generate Join parameter configuration conflict: obtainingValueFromField was undefined as " + obtainingValueFromField_orUndefined + " but relationship=true";
//             var err = new Error(errorString);
//             winston.error("❌  Error while generating field by join:", err);
//             return callback(err);
//         }
//     } else {
//         if (or_formingRelationship == true) {
//             var errorString = "Generate Join parameter configuration conflict: obtainingValueFromField was not undefined as " + obtainingValueFromField_orUndefined + " but relationship=false";
//             var err = new Error(errorString);
//             winston.error("❌  Error while generating field by join:", err);
//             return callback(err);
//         }
//     }

//     mongoose_client.WhenMongoDBConnected(function () { // ^ we block because we're going to work with the native connection; Mongoose doesn't block til connected for any but its own managed methods
//         winston.info("🔁  Generating field \"" + generateFieldNamed
//             + "\" of \"" + dataSource_title
//             + "\" by joining on \"" + findingMatchOnFields
//             + "\" of data source \"" + ofOtherRawSrcUID + "\" revision \"" + andOtherRawSrcImportRevision + "\".");

//         var pKey_ofFromDataSourceDoc = raw_source_documents.NewCustomPrimaryKeyStringWithComponents(ofOtherRawSrcUID, andOtherRawSrcImportRevision);
//         var pKey_ofDataSrcDocBeingProcessed = raw_source_documents.NewCustomPrimaryKeyStringWithComponents(dataSource_uid, dataSource_importRevision);
//         //
//         var mongooseContext_ofFromRawRowObjects = raw_row_objects.Lazy_Shared_RawRowObject_MongooseContext(pKey_ofFromDataSourceDoc);
//         var mongooseModel_ofFromRawRowObjects = mongooseContext_ofFromRawRowObjects.forThisDataSource_RawRowObject_model;
//         //
//         var mongooseContext_ofRawRowObjectsBeingProcessed = raw_row_objects.Lazy_Shared_RawRowObject_MongooseContext(pKey_ofDataSrcDocBeingProcessed);
//         var mongooseModel_ofRawRowObjectsBeingProcessed = mongooseContext_ofRawRowObjectsBeingProcessed.forThisDataSource_RawRowObject_model;
//         //
//         var mongooseContext_ofTheseProcessedRowObjects = _Lazy_Shared_ProcessedRowObject_MongooseContext(pKey_ofDataSrcDocBeingProcessed);
//         var mongooseModel_ofTheseProcessedRowObjects = mongooseContext_ofTheseProcessedRowObjects.Model;
//         var nativeCollection_ofTheseProcessedRowObjects = mongooseModel_ofTheseProcessedRowObjects.collection;
//         //
//         var bulkOperation_ofTheseProcessedRowObjects = nativeCollection_ofTheseProcessedRowObjects.initializeUnorderedBulkOp();
//         var findingMatchOnFields_length = findingMatchOnFields.length;
//         var getIdInsteadOfValueFromField = typeof obtainingValueFromField_orUndefined === 'undefined';
//         //
//         mongooseModel_ofRawRowObjectsBeingProcessed.find({}, function (err, ofTheseProcessedRowObjectDocs) {
//             if (err) {
//                 winston.error("❌  Error while generating field by reverse-join:", err);
//                 callback(err);

//                 return;
//             }

//             var countOfTheseProcessedRowObjectDocs = 0;
//             for (var i = 0; i < ofTheseProcessedRowObjectDocs.length; i++) {
//                 var ofTheseProcessedRowObjectDoc = ofTheseProcessedRowObjectDocs[i];
//                 var localFieldValue = ofTheseProcessedRowObjectDoc.rowParams["" + withLocalField];

//                 var matchConditions = [];
//                 for (var j = 0; j < findingMatchOnFields_length; j++) {
//                     var matchOnField = findingMatchOnFields[j];
//                     var condition = {};
//                     condition["rowParams." + matchOnField] = doesFieldMatch_regex(localFieldValue);
//                     matchConditions.push(condition);
//                 }

//                 var foreignValueToExtract = {};
//                 if (getIdInsteadOfValueFromField == true) {
//                     foreignValueToExtract["_id"] = 1;
//                 } else {
//                     foreignValueToExtract["rowParams." + obtainingValueFromField_orUndefined] = 1;
//                 }

//                 mongooseModel_ofFromRawRowObjects.find({
//                     $or: matchConditions
//                 }, foreignValueToExtract, function (err, matchingForeignValues) {
//                     if (err) {
//                         winston.error("❌  Error while generating field by join:", err);
//                         return callback(err);
//                     }

//                     if (countOfTheseProcessedRowObjectDocs != 0 && countOfTheseProcessedRowObjectDocs % 1000 == 0) {
//                         console.log("" + countOfTheseProcessedRowObjectDocs + " / " + ofTheseProcessedRowObjectDocs.length + " of local '" + pKey_ofDataSrcDocBeingProcessed + "' with foreign '" + pKey_ofFromDataSourceDoc + "'");
//                     }

//                     var persistableValue;
//                     if (matchingForeignValues && matchingForeignValues.length > 0) {
//                         if (isSingular) {
//                             persistableValue = getIdInsteadOfValueFromField ?
//                                 matchingForeignValues[0]._doc._id : matchingForeignValues[0]._doc.rowParams[obtainingValueFromField_orUndefined];
//                         } else {
//                             persistableValue = matchingForeignValues.map(function (el) {
//                                 if (getIdInsteadOfValueFromField == true) {
//                                     return el["_id"];
//                                 } else {
//                                     return el["rowParams." + obtainingValueFromField_orUndefined];
//                                 }
//                             });
//                         }
//                     } else {
//                         persistableValue = null;
//                     }
//                     //
//                     var bulkOperationQueryFragment =
//                     {
//                         pKey: ofTheseProcessedRowObjectDocs[countOfTheseProcessedRowObjectDocs].pKey,
//                         srcDocPKey: ofTheseProcessedRowObjectDocs[countOfTheseProcessedRowObjectDocs].srcDocPKey
//                     };
//                     var updateFragment = {};
//                     updateFragment["$set"] = {};
//                     updateFragment["$set"]["rowParams." + generateFieldNamed] = persistableValue;
//                     // ^ Note that we're only updating a specific path, not the whole rowParams value
//                     bulkOperation_ofTheseProcessedRowObjects.find(bulkOperationQueryFragment).upsert().update(updateFragment);
//                     countOfTheseProcessedRowObjectDocs++;
//                     //
//                     if (countOfTheseProcessedRowObjectDocs == ofTheseProcessedRowObjectDocs.length) proceedToPersist();
//                 });

//             }
//         });
//         //
//         function proceedToPersist() {
//             winston.info("📡  [" + (new Date()).toString() + "] Upserting processed rows for \"" + dataSource_title + "\" having generated fields named \"" + generateFieldNamed + "\".");
//             //
//             var writeConcern =
//             {
//                 upsert: true
//                 // note: we're turning this off as it's super slow for large datasets like Artworks
//                 // j: true // 'requests acknowledgement from MongoDB that the write operation has been written to the journal'
//             };
//             bulkOperation_ofTheseProcessedRowObjects.execute(writeConcern, function (err, result) {
//                 if (err) {
//                     winston.error("❌ [" + (new Date()).toString() + "] Error while saving generated fields of processed row objects: ", err);
//                 } else {
//                     winston.info("✅  [" + (new Date()).toString() + "] Saved generated fields on processed row objects.");
//                 }
//                 callback(err);
//             });
//         }
//     });
// };

module.exports.EnumerateProcessedDataset = function (datasetId,
                                                     parentId,
                                                     eachFn,
                                                     errFn,
                                                     completeFn,
                                                     query_optl) {
    // eachFn: (doc, cb) -> Void ……… call cb(null_optl) when done with doc
    // errFn: (err) -> Void
    // completeFn: () -> Void
    mongoose_client.WhenMongoDBConnected(function () { // ^ we block because we're going to work with the native connection; Mongoose doesn't block til connected for any but its own managed methods

        var iterateDataset = datasetId;
        if (parentId) iterateDataset = parentId;
        var mongooseContext_ofTheseProcessedRowObjects = _Lazy_Shared_ProcessedRowObject_MongooseContext(iterateDataset);
        var mongooseModel_ofTheseProcessedRowObjects = mongooseContext_ofTheseProcessedRowObjects.Model;
        var nativeCollection_ofTheseProcessedRowObjects = mongooseModel_ofTheseProcessedRowObjects.collection;
        //
        var hasErroredAndReturned = false;
        var hasReachedEndOfCursor = false;
        var numberOfDocumentsFoundButNotYetProcessed = 0;
        var numDocs = 0;
        //

        var query = {};
        if (parentId && typeof parentId  === 'string' && parentId != '') {
            query = {pKey: {$regex: "^" + datasetId + "-"}};
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

// only needed for image scraping using selector
var xray = require('x-ray');
var xray_instance = xray();


var image_hosting = require('../libs/utils/aws-image-hosting');

// customize it for string coming back from scraper
function extractRawUrl(scrapedString) {

    if (!scrapedString) {
        return "";
    }

    var urlsAndSizes = scrapedString.split('_');
    var largestSize = urlsAndSizes[0];
    if (largestSize == undefined) {
        console.log(urlsAndSizes);
    }
    return largestSize + 'jpg';
}

function scrapeImages(job,folder,mongooseModel, doc, imageField, hostingOpt, selector,outterCallback) {
    var htmlSourceAtURL = doc["rowParams"][imageField];

    winston.info("📡  Scraping image URL from \"" + htmlSourceAtURL + "\"…");
    job.log("📡  Scraping image URL from \"" + htmlSourceAtURL + "\"…");

    if (!selector || selector == null || selector == '') {
        return outterCallback(null,job,folder,mongooseModel, doc, htmlSourceAtURL,hostingOpt,null);
    }

    //update moma url and then export to csv
    xray_instance(htmlSourceAtURL,selector)
    .timeout(20000)
    (function(err,scrapedString) {
        if (err) {
            console.log(err);
        } else {    
  
           
               
            var u = extractRawUrl(scrapedString);
            console.log(u);


            var bulkOperationQueryFragment =
            {
                pKey: doc.pKey,
                srcDocPKey: doc.srcDocPKey
            };

            mongooseModel.update(bulkOperationQueryFragment,{$set: {"rowParams.imageURL": u}},function(err,d) {
                return outterCallback(null,null,null,null,null,null,null,selector);

            });
        }
    })
}



function updateDocWithImageUrl(job,folder,mongooseModel, doc, url, hostingOpt,selector,outterCallback) {
    //generating url only, no actual scraping
    if (selector && selector !== '' && typeof selector == 'string') {
        return outterCallback(null);
    }

    var destinationFilenameSansExt = doc.pKey;
    if (!hostingOpt) {
        hostingOpt = true;
    }

    image_hosting.hostImageLocatedAtRemoteURL(folder, url, hostingOpt,destinationFilenameSansExt, 
        function (err) {

        winston.info("🔁  Download/host image source for different sizes and views for doc " + doc.pKey);
        return outterCallback(err);
    });
}


module.exports.GenerateImageURLFieldsByScraping
    = function (job,dataSource_team_subdomain,datasetId, schemaId, imageSource, callback) {

    mongoose_client.WhenMongoDBConnected(function () { // ^ we block because we're going to work with the native connection; Mongoose doesn't block til connected for any but its own managed methods
        winston.info("🔁  Generating fields by scraping images for \"" + datasetId + "\".");
       
        var mongooseContext;
        var mongooseModel;

        var datasetQuery = {};

        if (schemaId) {
            datasetQuery["pKey"] = {$regex: "^" + datasetId + "-"}
            mongooseContext = _Lazy_Shared_ProcessedRowObject_MongooseContext(schemaId);
        } else {
             mongooseContext = _Lazy_Shared_ProcessedRowObject_MongooseContext(datasetId);
        }

        mongooseModel = mongooseContext.Model;

        datasetQuery["rowParams." + imageSource.field] = {$exists: true};
        datasetQuery["rowParams." + imageSource.field] = {$ne: ""};

        var folder =  dataSource_team_subdomain + '/datasets/' + ((schemaId) ? schemaId: datasetId) + '/assets/images/';

        var description = require('./descriptions');


        mongooseModel.find(datasetQuery, function (err, docs) { // this returns all docs in memory but at least it's simple to iterate them synchronously\

            var N = 30; //concurrency limit

            var counter = 0;

            var q = async.queue(function(task,cb) {

                var doc = task.doc;
            
                async.waterfall(
                    [async.apply(scrapeImages, job,folder,mongooseModel, doc,imageSource.field,imageSource.overwrite,imageSource.selector),
                        updateDocWithImageUrl
                    ], function (err) {
                       
                        cb(err);
                    })
            },N);


            q.drain = function() {
                winston.info("📡  all items are processed for scraping, successfully scraped all of the images ");

                if (!imageSource.selector || imageSource.selector == null || imageSource.selector == '') {

                    description.findOne({_id:datasetId},function(err,dataset) {

                        if (err) return callback(err);

                        dataset.fe_image.scraped = true;

                        if (dataset.fe_image.overwrite == true) {
                            dataset.fe_image.overwrite = false;
                        }

                        dataset.markModified('fe_image');

                        dataset.save(callback);
                    })

                } else {
                    callback(null); // all url has been saved to processed row objects
                }

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
// module.exports.RemoveRows = function (description, fn) {
//     var pKeyPrefix = description.dataset_uid;
//     var pKey_ofDataSrcDocBeingProcessed = raw_source_documents.NewCustomPrimaryKeyStringWithComponents(description.uid, description.importRevision);

//     winston.info("📡  [" + (new Date()).toString() + "] Deleting processed rows for \"" + description.title + "\".");

//     var mongooseContext_ofTheseProcessedRowObjects = _Lazy_Shared_ProcessedRowObject_MongooseContext(pKey_ofDataSrcDocBeingProcessed);
//     var mongooseModel_ofTheseProcessedRowObjects = mongooseContext_ofTheseProcessedRowObjects.Model;
//     var nativeCollection_ofTheseProcessedRowObjects = mongooseModel_ofTheseProcessedRowObjects.collection;
//     //
//     var query =
//     {
//         srcDocPKey: pKey_ofDataSrcDocBeingProcessed
//     };
//     if (pKeyPrefix) query.pKeyPrefix = {
//         $regex: "^" + pKeyPrefix + "-",
//         $options: 'i'
//     }

//     nativeCollection_ofTheseProcessedRowObjects.find(query).remove().exec(function (err) {
//         if (err) {
//             winston.error("❌ [" + (new Date()).toString() + "] Error while removing raw row objects: ", err);
//         } else {
//             winston.info("✅  [" + (new Date()).toString() + "] Removed raw row objects.");
//         }
//         fn(err);
//     });
// };