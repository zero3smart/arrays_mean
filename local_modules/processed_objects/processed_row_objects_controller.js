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
    = function(dataSource_uid,
               dataSource_importRevision,
               dataSource_title,
               callback)
{
    var self = this;
    mongoose_client.WhenMongoDBConnected(function()
    { // ^ we block because we're going to work with the native connection; Mongoose doesn't block til connected for any but its own managed methods
        winston.info("🔁  Pre-generating whole processed row objects collection from raw row objects of \"" + dataSource_title + "\".");
                
        var pKey_ofDataSrcDocBeingProcessed = self.context.raw_source_documents_controller.NewCustomPrimaryKeyStringWithComponents(dataSource_uid, dataSource_importRevision);
        //
        var mongooseContext_ofRawRowObjectsBeingProcessed = self.context.raw_row_objects_controller.Lazy_Shared_RawRowObject_MongooseContext(pKey_ofDataSrcDocBeingProcessed);
        var mongooseModel_ofRawRowObjectsBeingProcessed = mongooseContext_ofRawRowObjectsBeingProcessed.forThisDataSource_RawRowObject_model;
        var nativeCollection_ofRawRowObjectsBeingProcessed = mongooseModel_ofRawRowObjectsBeingProcessed.collection;
        //
        var mongooseContext_ofTheseProcessedRowObjects = self.Lazy_Shared_ProcessedRowObject_MongooseContext(pKey_ofDataSrcDocBeingProcessed);
        var mongooseModel_ofTheseProcessedRowObjects = mongooseContext_ofTheseProcessedRowObjects.Model;
        var nativeCollection_ofTheseProcessedRowObjects = mongooseModel_ofTheseProcessedRowObjects.collection;
        //
        var bulkOperation_ofTheseProcessedRowObjects = nativeCollection_ofTheseProcessedRowObjects.initializeUnorderedBulkOp(); 
        //
        var numDocs = 0; // to derive
        //
        function proceedToPersist()
        {
            winston.info("📡  [" + (new Date()).toString() + "] Upserting " + numDocs + " processed rows for \"" + dataSource_title + "\".");
            
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
                // we do not $set the whole doc but use rowParams.* paths so that 
                // we don't overwrite the whole doc, blowing away stuff like already-imported images
                var byPathUpdateDoc = _new_byPathUpdateDoc_fromPureDocUpdates(doc);
                bulkOperation_ofTheseProcessedRowObjects.find(bulkOperationQueryFragment).upsert().update({ $set: byPathUpdateDoc });
                //
                _finishedWithDoc();
            });
        });
    });
}
function _new_byPathUpdateDoc_fromPureDocUpdates(doc)
{
    var byPathUpdateDoc = {};
    var rootKeys = Object.keys(doc);
    var rootKeys_length = rootKeys.length;
    for (var i = 0 ; i < rootKeys_length ; i++) {
        var key = rootKeys[i];
        var val = doc[key];
        if (key !== 'rowParams') {
            byPathUpdateDoc[key] = val;
        } else {
            var rowParams_keys = Object.keys(val);
            var rowParams_keys_length = rowParams_keys.length;
            for (var i = 0 ; i < rowParams_keys_length ; i++) {
                var rowParams_key = rowParams_keys[i];
                var rowParams_val = val[rowParams_key];
                byPathUpdateDoc['rowParams.' + rowParams_key] = rowParams_val;
            }
        }
    }
    
    return byPathUpdateDoc;
}
//
//
constructor.prototype.GenerateFieldsByJoining 
    = function(dataSource_uid,
               dataSource_importRevision,
               dataSource_title,
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
                        + "\" of \"" + dataSource_title 
                        + "\" by joining on \"" + onField 
                        + "\" of data source \"" + ofOtherRawSrcUID + "\" revision \"" + andOtherRawSrcImportRevision + "\".");
                    
        var pKey_ofFromDataSourceDoc = self.context.raw_source_documents_controller.NewCustomPrimaryKeyStringWithComponents(ofOtherRawSrcUID, andOtherRawSrcImportRevision);
        var pKey_ofDataSrcDocBeingProcessed = self.context.raw_source_documents_controller.NewCustomPrimaryKeyStringWithComponents(dataSource_uid, dataSource_importRevision);
        //
        var mongooseContext_ofRawRowObjectsBeingProcessed = self.context.raw_row_objects_controller.Lazy_Shared_RawRowObject_MongooseContext(pKey_ofDataSrcDocBeingProcessed);
        var mongooseModel_ofRawRowObjectsBeingProcessed = mongooseContext_ofRawRowObjectsBeingProcessed.forThisDataSource_RawRowObject_model;
        var nativeCollection_ofRawRowObjectsBeingProcessed = mongooseModel_ofRawRowObjectsBeingProcessed.collection;
        var mongooseScheme_ofRawRowObjectsBeingProcessed = mongooseContext_ofRawRowObjectsBeingProcessed.forThisDataSource_RawRowObject_scheme;
        //
        var mongooseContext_ofTheseProcessedRowObjects = self.Lazy_Shared_ProcessedRowObject_MongooseContext(pKey_ofDataSrcDocBeingProcessed);
        var mongooseModel_ofTheseProcessedRowObjects = mongooseContext_ofTheseProcessedRowObjects.Model;
        var nativeCollection_ofTheseProcessedRowObjects = mongooseModel_ofTheseProcessedRowObjects.collection;
        //
        var bulkOperation_ofTheseProcessedRowObjects = nativeCollection_ofTheseProcessedRowObjects.initializeUnorderedBulkOp(); 
        //       
        var numDocs = 0;
        //
        function proceedToPersist()
        {
            winston.info("📡  [" + (new Date()).toString() + "] Upserting " + numDocs + " processed rows for \"" + dataSource_title + "\" having generated fields named \"" + generateFieldNamed + "\".");
        
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
                    winston.warn("⚠️  Each called after hasErroredAndReturned.");
            
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
                    var errorString = "\"" + withLocalField + "\" of a \"" + dataSource_title + "\" was undefined or null";
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
//
constructor.prototype.EnumerateProcessedDataset
    = function(dataSource_uid,
               dataSource_importRevision,
               eachFn,
               errFn,
               completeFn,
               query_optl)
{ 
    // eachFn: (doc, cb) -> Void ……… call cb(null_optl) when done with doc
    // errFn: (err) -> Void
    // completeFn: () -> Void
    var self = this;
    mongoose_client.WhenMongoDBConnected(function()
    { // ^ we block because we're going to work with the native connection; Mongoose doesn't block til connected for any but its own managed methods

        var pKey_ofDataSrcDocBeingProcessed = self.context.raw_source_documents_controller.NewCustomPrimaryKeyStringWithComponents(dataSource_uid, dataSource_importRevision);
        //
        var mongooseContext_ofTheseProcessedRowObjects = self.Lazy_Shared_ProcessedRowObject_MongooseContext(pKey_ofDataSrcDocBeingProcessed);
        var mongooseModel_ofTheseProcessedRowObjects = mongooseContext_ofTheseProcessedRowObjects.Model;
        var nativeCollection_ofTheseProcessedRowObjects = mongooseModel_ofTheseProcessedRowObjects.collection;
        //
        var hasErroredAndReturned = false;
        var hasReachedEndOfCursor = false;
        var numberOfDocumentsFoundButNotYetProcessed = 0;
        var numDocs = 0;
        //
        var query;
        if (query_optl == null || typeof query_optl === 'undefined') {
            query = {};
        } else {
            query = query_optl;
        }
        nativeCollection_ofTheseProcessedRowObjects.find(query, {}, function(err, cursor)
        {
            if (err) { // No cursor yet so we do not call closeCursorAndReturnWithErr(err)
                hasErroredAndReturned = true;
                errFn(err);

                return;
            }
            function closeCursorAndReturnWithErr(err) 
            {
                hasErroredAndReturned = true;
                cursor.close(function(closeErr, result) 
                {
                    if (closeErr != null) {
                        winston.warn("⚠️  Error has occurred on cursor close after err returned from each doc:", closeErr);
                    }
                    errFn(err);
                });
            }
            cursor.each(function(err, doc)
            {
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
                function _finishedWithDoc()
                {
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
                eachFn(doc, function(err)
                {
                    if (err != null && typeof err !== 'undefined') {
                        closeCursorAndReturnWithErr(err);
                    }
                    _finishedWithDoc();
                });
            });
        });
    });
}
//
//
const xray = require('x-ray');
const xray_instance = xray();
//
const image_hosting = require('./googlecloudstorage-image_hosting');
//
constructor.prototype.GenerateImageURLFieldsByScraping 
    = function(dataSource_uid,
               dataSource_importRevision,
               dataSource_title,
               htmlSourceAtURLInField, 
               imageSrcSetInSelector, 
               prependToImageURLs,
               useAndHostSrcSetSizeByField, 
               callback)
{
    var self = this;
    //
    var useAndHostSrcSetSizeByField_keys = Object.keys(useAndHostSrcSetSizeByField);
    var useAndHostSrcSetSizeByField_keys_length = useAndHostSrcSetSizeByField_keys.length;
    //
    mongoose_client.WhenMongoDBConnected(function()
    { // ^ we block because we're going to work with the native connection; Mongoose doesn't block til connected for any but its own managed methods
        winston.info("🔁  Generating fields by scraping images for \"" + dataSource_title + "\".");
        //
        var pKey_ofDataSrcDocBeingProcessed = self.context.raw_source_documents_controller.NewCustomPrimaryKeyStringWithComponents(dataSource_uid, dataSource_importRevision);
        //
        var mongooseContext = self.Lazy_Shared_ProcessedRowObject_MongooseContext(pKey_ofDataSrcDocBeingProcessed);
        var mongooseModel = mongooseContext.Model;
        //
        mongooseModel.find({}, function(err, docs)
        { // this returns all docs in memory but at least it's simple to iterate them synchronously
            var docs_length = docs.length;
            var concurrencyLimit = 15; // at a time
            async.eachLimit(docs, concurrencyLimit, function(doc, eachCb)
            {
                var anyImagesNeedToBeScraped = false;
                // The following allows us to skip scraping for this doc if we already have done so
                for (var i = 0 ; i < useAndHostSrcSetSizeByField_keys_length ; i++) {
                    var key = useAndHostSrcSetSizeByField_keys[i];
                    var hostedURLForKey = doc["rowParams"][key];
                    if (typeof hostedURLForKey === 'undefined') { 
                        // != null b/c null means scraped but no image
                        anyImagesNeedToBeScraped = true;
                        break;
                    }
                }
                if (anyImagesNeedToBeScraped == false) {
                    winston.info("💬  Already scraped all images for row at idx " + doc.rowIdxInDoc + " for fields ", useAndHostSrcSetSizeByField_keys);
                    async.setImmediate(function() { // so as not to blow stack
                        eachCb(); // already done
                    });
                    
                    return;
                }
                //
                var htmlSourceAtURL = doc["rowParams"][htmlSourceAtURLInField];
                if (htmlSourceAtURL == null || typeof htmlSourceAtURL === 'undefined' || htmlSourceAtURL == "") {
                    // nothing to scrape
                    async.setImmediate(function() { // so as not to blow stack
                        eachCb();
                    });
                    
                    return;
                }
                winston.info("📡  Scraping image URL from \"" + htmlSourceAtURL + "\"…");
                xray_instance(htmlSourceAtURL, imageSrcSetInSelector)(function(err, scrapedString)
                {
                    if (err) {
                        winston.error("❌  Error while scraping " + htmlSourceAtURL + ": ", err);
                        eachCb(err);

                        return;
                    }
                    function proceedToPersistHostedImageURLOrNull_forKey(err, hostedURLOrNull, fieldKey, persistedCb)
                    {
                        if (err) {
                            persistedCb(err);    
                            return;
                        }
                        winston.info("📝  Saving " + hostedURLOrNull + " at " + fieldKey + " of " + doc.pKey);
                        var docQuery = 
                        {
                            pKey: doc.pKey,
                            srcDocPKey: doc.srcDocPKey // not necessary since we're in one collection but just in case that gets changed..
                        };
                        var docUpdate = {};
                        docUpdate["rowParams." + fieldKey] = hostedURLOrNull; // note it's a path rather than an object, so we don't overwrite the whole top-level key of 'rowParams'
                        mongooseModel.update(docQuery, docUpdate, function(err)
                        {
                            persistedCb(err);
                        });
                    }
                    if (scrapedString == null || typeof scrapedString === 'undefined' || scrapedString == "") {
                        winston.info("💬  No images available for " + doc.srcDocPKey + " row with pKey " + doc.pKey + ". Saving nulls in image fields.");
                        // persist this as a 'null' in the db for all keys by calling proceedToPersistHostedImageURLOrNull_forKey for each key, as there were no images available on site src
                        async.each(useAndHostSrcSetSizeByField_keys, function(key, cb)
                        {
                            proceedToPersistHostedImageURLOrNull_forKey(null, null, key, function(err)
                            {
                                cb(err);
                            });
                        }, function(err)
                        {
                            eachCb(err);
                        });
                        
                        return;
                    }
                    // console.log("obtained scrapedString", scrapedString);
                    // Now we need to parse this string
                    // First by splitting on ', '
                    var urlsAndSizes = scrapedString.split(', ');
                    var rawURLsBySize = {}; // now to construct this
                    var urlsAndSizes_length = urlsAndSizes.length;
                    if (urlsAndSizes_length == 0) {
                        winston.error("❌  urlsAndSizes_length was 0.");
                        eachCb(); // nothing to do
                        
                        return;
                    }
                    for (var i = 0 ; i < urlsAndSizes_length ; i++) {
                        var urlAndSizeString = urlsAndSizes[i];
                        var components = urlAndSizeString.split(' ');
                        if (components.length != 2) {
                            var err = new Error("Unexpected format of image url srcset contents");
                            eachCb(err);
                            
                            return;
                        }
                        var rawURL = components[0];
                        var size = components[1];
                        rawURLsBySize[size] = rawURL;
                    }
                    // console.log("rawURLsBySize " , rawURLsBySize)
                    async.each(useAndHostSrcSetSizeByField_keys, function(key, cb)
                    {
                        var preexisting_hostedURLForKey = doc["rowParams"][key];
                        if (typeof preexisting_hostedURLForKey !== 'undefined') {
                            winston.warn("⚠️  " + key + " has already been downloaded as " + preexisting_hostedURLForKey);
                            cb();
                            
                            return;
                        }
                        var descriptionOf_useAndHostSrcSetSizeForField = useAndHostSrcSetSizeByField[key];
                        var sizeForFieldKey = descriptionOf_useAndHostSrcSetSizeForField.size;
                        var rawURLForSize = rawURLsBySize[sizeForFieldKey];
                        if (rawURLForSize == null || typeof rawURLForSize === 'undefined') {
                            var err = new Error("No available URL for size " + sizeForFieldKey + " in scraped image src set " + rawURLsBySize + " for", doc);
                            cb(err);
                            
                            return;
                        }
                        var finalized_imageSourceURLForSize = prependToImageURLs + rawURLForSize;
                        // winston.info("🔁  Download/host and store hosted url for original " + finalized_imageSourceURLForSize)
                        var hostingOpts = 
                        {
                            overwrite: false // if already exists, do not re-upload
                        };
                        var destinationFilenameSansExt = doc.srcDocPKey + "__" + doc.pKey + "__" + key;
                        image_hosting.hostImageLocatedAtRemoteURL(finalized_imageSourceURLForSize, destinationFilenameSansExt, hostingOpts, function(err, hostedURL)
                        {
                            proceedToPersistHostedImageURLOrNull_forKey(err, hostedURL, key, function(err)
                            {
                                cb(err);
                            });
                        });
                    }, function(err)
                    {
                        if (err) {
                            winston.error("❌  Error while downloading, uploading, or storing URLs for images: ", err);
                            eachCb(err);

                            return;
                        }
                        eachCb();
                    });
                });
                
            }, function(err)
            {
                callback(err);
            });
        });
    });
};
