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
    var forThisDataSource_ProcessedRowObject_scheme = Schema({
        pKey: String,
        srcDocPKey: String,
        rowIdxInDoc: Number,
        rowParams: Schema.Types.Mixed // be sure to call .markModified(path) on the model before saving if you update this Mixed property
    });
    forThisDataSource_ProcessedRowObject_scheme.index({ pKey: 1, srcDocPKey: 1 }, { unique: true });
    forThisDataSource_ProcessedRowObject_scheme.index({ srcDocPKey: 1 }, { unique: false });
    //
    var forThisDataSource_rowObjects_modelName = self.New_RowObjectsModelName(srcDocPKey);
    var forThisDataSource_ProcessedRowObject_model = mongoose.model(forThisDataSource_rowObjects_modelName, forThisDataSource_ProcessedRowObject_scheme);
    //
    mongooseContext = 
    {
        forThisDataSource_ProcessedRowObject_scheme: forThisDataSource_ProcessedRowObject_scheme,
        forThisDataSource_rowObjects_modelName: forThisDataSource_rowObjects_modelName,
        forThisDataSource_ProcessedRowObject_model: forThisDataSource_ProcessedRowObject_model
    };
    self.MongooseContextsBySrcDocPKey[srcDocPKey] = mongooseContext;
    
    return mongooseContext;
};
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
    winston.info("🔁  Generating field \"" + generateFieldNamed 
                    + "\" of \"" + rawDataSource_title 
                    + "\" by joining on \"" + onField 
                    + "\" of data source \"" + ofOtherRawSrcUID + "\" revision \"" + andOtherRawSrcImportRevision + "\".");
                    
    var pKey_ofFromDataSourceDoc = self.context.raw_source_documents_controller.NewCustomPrimaryKeyStringWithComponents(ofOtherRawSrcUID, andOtherRawSrcImportRevision);
    var pKey_ofRawRowObjectsBeingProcessed = self.context.raw_source_documents_controller.NewCustomPrimaryKeyStringWithComponents(rawDataSource_uid, rawDataSource_importRevision);
    //
    var mongooseContext_ofRawRowObjectsBeingProcessed = self.context.raw_row_objects_controller.Lazy_Shared_RawRowObject_MongooseContext(pKey_ofRawRowObjectsBeingProcessed);
    var mongooseModel_ofRawRowObjectsBeingProcessed = mongooseContext_ofRawRowObjectsBeingProcessed.forThisDataSource_RawRowObject_model;
    var nativeCollection_ofRawRowObjectsBeingProcessed = mongooseModel_ofRawRowObjectsBeingProcessed.collection;
    // var mongooseScheme_ofRawRowObjectsBeingProcessed = artworks_mongooseContext.forThisDataSource_RawRowObject_scheme;
    // mongooseScheme_ofRawRowObjectsBeingProcessed.index({ "rowParams._________": 1 }, { unique: false });
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
                
                return;
            }
            //
            numberOfDocumentsFoundButNotYetProcessed += 1;
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
            console.log("fieldValue " , fieldValue)
            function _finishedWithDoc()
            {
                numberOfDocumentsFoundButNotYetProcessed -= 1; // finished with this doc - decrement
                //
                if (hasReachedEndOfCursor == true) {
                    if (numberOfDocumentsFoundButNotYetProcessed == 0) {
                        console.log("Reached end of cursor and finished processing all")
                        callback();
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
                console.log("Obtained persistable value…", persistableValue);
                // TODO: perform the following only after upserting this doc
                //
                _finishedWithDoc();
            });
        });
    });
};
//























