const async = require('async');
const winston = require('winston');
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
module.exports = constructor;
constructor.prototype._init = function()
{
    var self = this;
    // console.log("processed row objects documents controller is up")
};
//
constructor.prototype.New_templateForPersistableObject = function(rowObject_primaryKey, sourceDocumentRevisionKey, rowIndex, rowParams)
{
    return {
        pKey: rowObject_primaryKey, // Queries to find this unique row will have to happen 
        srcDocPKey: sourceDocumentRevisionKey, // by pKey && srcDocPKey
        rowIdxInDoc: rowIndex,
        rowParams: rowParams
    };
}
//
const mongoose_client = require('../mongoose_client/mongoose_client');
const mongoose = mongoose_client.mongoose;
const Schema = mongoose.Schema;
//
//
constructor.prototype.New_RowObjectsModelName = function(srcDocPKey)
{
    return 'ProcessedRowObjects-' + srcDocPKey;
};
constructor.prototype.MongooseContextsBySrcDocPKey = {};
constructor.prototype.Lazy_Shared_ProcessedRowObject_MongooseContext = function(srcDocPKey)
{
    var self = this;
    //
    var mongooseContext = self.MongooseContextsBySrcDocPKey[srcDocPKey];
    if (mongooseContext && typeof mongooseContext !== 'undefined') { // lazy cache, to avoid mongoose model re-definition error
        return mongooseContext;
    }
    //
    var Scheme = Schema({
        pKey: String,
        srcDocPKey: String,
        rowIdxInDoc: Number,
        rowParams: Schema.Types.Mixed // be sure to call .markModified(path) on the model before saving if you update this Mixed property via Mongoose
    });
    Scheme.index({ pKey: 1, srcDocPKey: 1 }, { unique: true });
    Scheme.index({ srcDocPKey: 1 }, { unique: false });
    //
    var ModelName = self.New_RowObjectsModelName(srcDocPKey);
    var Model = mongoose.model(ModelName, Scheme);
    //
    mongooseContext = 
    {
        Scheme: Scheme,
        ModelName: ModelName,
        Model: Model
    };
    self.MongooseContextsBySrcDocPKey[srcDocPKey] = mongooseContext;
    
    return mongooseContext;
};
//
//
constructor.prototype.GenerateProcessedDatasetFromRawRowObjects 
    = function(rawDataSource_uid,
               rawDataSource_importRevision,
               rawDataSource_title,
               callback)
{
    var self = this;
    mongoose_client.WhenMongoDBConnected(function()
    { // ^ we block because we're going to work with the native connection; Mongoose doesn't block til connected for any but its own managed methods
        winston.info("🔁  Pre-generating whole processed row objects collection from raw row objects of \"" + rawDataSource_title + "\" .");
                
        var pKey_ofRawDataSrcDocBeingProcessed = self.context.raw_source_documents_controller.NewCustomPrimaryKeyStringWithComponents(rawDataSource_uid, rawDataSource_importRevision);
        //
        var mongooseContext_ofRawRowObjectsBeingProcessed = self.context.raw_row_objects_controller.Lazy_Shared_RawRowObject_MongooseContext(pKey_ofRawDataSrcDocBeingProcessed);
        var mongooseModel_ofRawRowObjectsBeingProcessed = mongooseContext_ofRawRowObjectsBeingProcessed.forThisDataSource_RawRowObject_model;
        var nativeCollection_ofRawRowObjectsBeingProcessed = mongooseModel_ofRawRowObjectsBeingProcessed.collection;
        //
        var mongooseContext_ofTheseProcessedRowObjects = self.Lazy_Shared_ProcessedRowObject_MongooseContext(pKey_ofRawDataSrcDocBeingProcessed);
        var mongooseModel_ofTheseProcessedRowObjects = mongooseContext_ofTheseProcessedRowObjects.Model;
        var nativeCollection_ofTheseProcessedRowObjects = mongooseModel_ofTheseProcessedRowObjects.collection;
        //
        var bulkOperation_ofTheseProcessedRowObjects = nativeCollection_ofTheseProcessedRowObjects.initializeUnorderedBulkOp(); 
        //
        var numDocs = 0; // to derive
        //
        function proceedToPersist()
        {
            winston.info("📡  [" + (new Date()).toString() + "] Upserting " + numDocs + " processed rows for \"" + rawDataSource_title + "\".");
            
            var writeConcern =
            {
                upsert: true
                // note: we're turning this off as it's super slow for large datasets like Artworks
                // j: true // 'requests acknowledgement from MongoDB that the write operation has been written to the journal'
            };
            bulkOperation_ofTheseProcessedRowObjects.execute(writeConcern, function(err, result)
            {
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
        nativeCollection_ofRawRowObjectsBeingProcessed.find({}, {}, function(err, cursor)
        {
            if (err) {
                winston.error("❌  Error while generating processed row objects:", err);
                hasErroredAndReturned = true;
                callback(err);
                    
                return;
            }
            cursor.each(function(err, doc)
            {
                if (hasErroredAndReturned == true) {
                    winston.error("‼️  Each called after hasErroredAndReturned.");
            
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
                function _finishedWithDoc()
                {
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
                bulkOperation_ofTheseProcessedRowObjects.find(bulkOperationQueryFragment).upsert().update({ $set: doc });
                //
                _finishedWithDoc();
            });
        });
    });
}
//
//
constructor.prototype.GenerateFieldsByJoining 
    = function(rawDataSource_uid,
               rawDataSource_importRevision,
               rawDataSource_title,
               generateFieldNamed, 
               isSingular, 
               onField, 
               ofOtherRawSrcUID, 
               andOtherRawSrcImportRevision,
               withLocalField, 
               obtainingValueFromField, 
               callback)
{
    var self = this;
    mongoose_client.WhenMongoDBConnected(function()
    { // ^ we block because we're going to work with the native connection; Mongoose doesn't block til connected for any but its own managed methods
        winston.info("🔁  Generating field \"" + generateFieldNamed 
                        + "\" of \"" + rawDataSource_title 
                        + "\" by joining on \"" + onField 
                        + "\" of data source \"" + ofOtherRawSrcUID + "\" revision \"" + andOtherRawSrcImportRevision + "\".");
                    
        var pKey_ofFromDataSourceDoc = self.context.raw_source_documents_controller.NewCustomPrimaryKeyStringWithComponents(ofOtherRawSrcUID, andOtherRawSrcImportRevision);
        var pKey_ofRawDataSrcDocBeingProcessed = self.context.raw_source_documents_controller.NewCustomPrimaryKeyStringWithComponents(rawDataSource_uid, rawDataSource_importRevision);
        //
        var mongooseContext_ofRawRowObjectsBeingProcessed = self.context.raw_row_objects_controller.Lazy_Shared_RawRowObject_MongooseContext(pKey_ofRawDataSrcDocBeingProcessed);
        var mongooseModel_ofRawRowObjectsBeingProcessed = mongooseContext_ofRawRowObjectsBeingProcessed.forThisDataSource_RawRowObject_model;
        var nativeCollection_ofRawRowObjectsBeingProcessed = mongooseModel_ofRawRowObjectsBeingProcessed.collection;
        // var mongooseScheme_ofRawRowObjectsBeingProcessed = artworks_mongooseContext.forThisDataSource_RawRowObject_scheme;
        // mongooseScheme_ofRawRowObjectsBeingProcessed.index({ "rowParams._________": 1 }, { unique: false });
        //
        var mongooseContext_ofTheseProcessedRowObjects = self.Lazy_Shared_ProcessedRowObject_MongooseContext(pKey_ofRawDataSrcDocBeingProcessed);
        var mongooseModel_ofTheseProcessedRowObjects = mongooseContext_ofTheseProcessedRowObjects.Model;
        var nativeCollection_ofTheseProcessedRowObjects = mongooseModel_ofTheseProcessedRowObjects.collection;
        //
        var bulkOperation_ofTheseProcessedRowObjects = nativeCollection_ofTheseProcessedRowObjects.initializeUnorderedBulkOp(); 
        //       
        var numDocs = 0;
        //
        function proceedToPersist()
        {
            winston.info("📡  [" + (new Date()).toString() + "] Upserting " + numDocs + " processed rows for \"" + rawDataSource_title + "\" having generated fields named \"" + generateFieldNamed + "\".");
            
            var writeConcern =
            {
                upsert: true
                // note: we're turning this off as it's super slow for large datasets like Artworks
                // j: true // 'requests acknowledgement from MongoDB that the write operation has been written to the journal'
            };
            bulkOperation_ofTheseProcessedRowObjects.execute(writeConcern, function(err, result)
            {
                if (err) {
                    winston.error("❌ [" + (new Date()).toString() + "] Error while saving generated fields of processed row objects: ", err);
                } else {
                    winston.info("✅  [" + (new Date()).toString() + "] Saved generated fields on processed row objects.");
                }
                callback(err);
            });
        }
        //
        //
        var hasErroredAndReturned = false;
        var hasReachedEndOfCursor = false;
        var numberOfDocumentsFoundButNotYetProcessed = 0;
        nativeCollection_ofRawRowObjectsBeingProcessed.find({}, {}, function(err, cursor)
        {
            if (err) {
                winston.error("❌  Error while generating field by join:", err);
                hasErroredAndReturned = true;
                callback(err);
                        
                return;
            }
            cursor.each(function(err, doc)
            {
                if (hasErroredAndReturned == true) {
                    winston.error("‼️  Each called after hasErroredAndReturned.");
                
                    return;
                }
                if (err) {
                    winston.error("❌  Error while generating field by join:", err);
                    hasErroredAndReturned = true;
                    callback(err);
                        
                    return;
                }
                if (doc === null) { // then we're finished
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
                var fieldValue = doc["rowParams"][withLocalField];
                if (typeof fieldValue === 'undefined' || fieldValue == null) {
                    var errorString = "\"" + withLocalField + "\" of a \"" + rawDataSource_title + "\" was undefined or null";
                    var err = new Error(errorString);
                    winston.warn("❌  " + errorString + ". Bailing.");
                    hasErroredAndReturned = true;
                    callback(err);
            
                    return;
                }

                function _finishedWithDoc()
                {
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
                self.context.questions_controller.FieldValuesOf_RawRowObjectsInSrcDoc_WhereFieldValueIs("rowParams." + obtainingValueFromField,
                                                                                                        pKey_ofFromDataSourceDoc,
                                                                                                        "rowParams." + onField,
                                                                                                        fieldValue,
                                                                                                        function(err, values)
                {
                    if (hasErroredAndReturned == true) {
                        return;
                    }
                    if (err) {
                        winston.error("❌  Error while generating field by join:", err);
                        hasErroredAndReturned = true;
                        callback(err);
                
                        return;
                    }
                    if (isSingular) {
                        persistableValue = values.length > 0 ? values[0] : null;
                    } else {
                        persistableValue = values;
                    }
                    if (typeof persistableValue === 'undefined') {
                        var errorString = "Value obtained by joining \"" + withLocalField + "\" of a \"" + ofOtherRawSrcUID + "\" was undefined";
                        var err = new Error(errorString);
                        winston.warn("❌  " + errorString + ". Bailing.");
                        hasErroredAndReturned = true;
                        callback(err);
            
                        return;
                    }
                    // console.log("Obtained persistable value…", persistableValue);
                    //
                    //
                    var bulkOperationQueryFragment =
                    {
                        pKey: doc.pKey,
                        srcDocPKey: doc.srcDocPKey
                    };
                    var updateFragment = {};
                    updateFragment["$set"] = {};
                    updateFragment["$set"]["rowParams." + generateFieldNamed] = persistableValue; // Note that we're only updating a specific path, not the whole rowParams value
                    //
                    bulkOperation_ofTheseProcessedRowObjects.find(bulkOperationQueryFragment).upsert().update(updateFragment);
                    //
                    _finishedWithDoc();
                });
            });
        });
    });
};
//























