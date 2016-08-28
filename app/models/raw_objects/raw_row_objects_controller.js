var async = require('async');
var winston = require('winston');
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
    // console.log("raw row objects documents controller is up")
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
var mongoose_client = require('../../../lib/mongoose_client/mongoose_client');
var mongoose = mongoose_client.mongoose;
var Schema = mongoose.Schema;
//
//
constructor.prototype.New_RowObjectsModelName = function(srcDocPKey)
{
    return 'RawRowObjects-' + srcDocPKey;
};
constructor.prototype.MongooseContextsBySrcDocPKey = {};
constructor.prototype.Lazy_Shared_RawRowObject_MongooseContext = function(srcDocPKey)
{
    var self = this;
    //
    var mongooseContext = self.MongooseContextsBySrcDocPKey[srcDocPKey];
    if (mongooseContext && typeof mongooseContext !== 'undefined') { // lazy cache, to avoid mongoose model re-definition error
        return mongooseContext;
    }
    //
    var forThisDataSource_RawRowObject_scheme = Schema({
        pKey: String,
        srcDocPKey: String,
        rowIdxInDoc: Number,
        rowParams: Schema.Types.Mixed // be sure to call .markModified(path) on the model before saving if you update this Mixed property
    });
    forThisDataSource_RawRowObject_scheme.index({ pKey: 1, srcDocPKey: 1 }, { unique: true });
    forThisDataSource_RawRowObject_scheme.index({ srcDocPKey: 1 }, { unique: false });
    //
    var forThisDataSource_rowObjects_modelName = self.New_RowObjectsModelName(srcDocPKey);
    var forThisDataSource_RawRowObject_model = mongoose.model(forThisDataSource_rowObjects_modelName, forThisDataSource_RawRowObject_scheme);
    //
    mongooseContext = 
    {
        forThisDataSource_RawRowObject_scheme: forThisDataSource_RawRowObject_scheme,
        forThisDataSource_rowObjects_modelName: forThisDataSource_rowObjects_modelName,
        forThisDataSource_RawRowObject_model: forThisDataSource_RawRowObject_model
    };
    self.MongooseContextsBySrcDocPKey[srcDocPKey] = mongooseContext;
    
    return mongooseContext;
};
//
//
////////////////////////////////////////////////////////////////////////////////
// Public - Imperatives - Upserts - Bulk
//
constructor.prototype.UpsertWithManyPersistableObjectTemplates = function(ordered_persistableObjectTemplateUIDs, persistableObjectTemplatesByUID, srcDocPKey, srcDocTitle, fn)
{ // fn: (err, [Schema.Types.ObjectId])
    var self = this;
    
    var num_parsed_orderedRowObjectPrimaryKeys = ordered_persistableObjectTemplateUIDs.length;
    winston.info("📡  [" + (new Date()).toString() + "] Upserting " + num_parsed_orderedRowObjectPrimaryKeys + " parsed rows for \"" + srcDocTitle + "\".");
    
    var forThisDataSource_mongooseContext = self.Lazy_Shared_RawRowObject_MongooseContext(srcDocPKey);
    var forThisDataSource_RawRowObject_scheme = forThisDataSource_mongooseContext.forThisDataSource_RawRowObject_scheme;
    var forThisDataSource_rowObjects_modelName = forThisDataSource_mongooseContext.forThisDataSource_rowObjects_modelName;
    var forThisDataSource_RawRowObject_model = forThisDataSource_mongooseContext.forThisDataSource_RawRowObject_model;
    //
    mongoose_client.WhenMongoDBConnected(function()
    { // ^ we block because we're going to work with the native connection; Mongoose doesn't block til connected for any but its own managed methods
        var nativeCollection = forThisDataSource_RawRowObject_model.collection;
        var bulkOperation = nativeCollection.initializeUnorderedBulkOp();
        var num_ordered_persistableObjectTemplateUIDs = ordered_persistableObjectTemplateUIDs.length;
                
        for (var rowIdx = 0 ; rowIdx < num_ordered_persistableObjectTemplateUIDs ; rowIdx++) {            
            var rowUID = ordered_persistableObjectTemplateUIDs[rowIdx];
            var persistableObjectTemplate = persistableObjectTemplatesByUID[rowUID];
            var persistableObjectTemplate_pKey = persistableObjectTemplate.pKey;
            var persistableObjectTemplate_srcDocPKey = persistableObjectTemplate.srcDocPKey;
            var bulkOperationQueryFragment = 
            {
                pKey: persistableObjectTemplate_pKey,
                srcDocPKey: srcDocPKey
            };
            bulkOperation.find(bulkOperationQueryFragment).upsert().update({ $set: persistableObjectTemplate });
        }
        var writeConcern =
        {
            upsert: true
            // note: we're turning this off as it's super slow for large datasets like Artworks
            // j: true // 'requests acknowledgement from MongoDB that the write operation has been written to the journal'
        };
        bulkOperation.execute(writeConcern, function(err, result)
        {
            if (err) {
                winston.error("❌ [" + (new Date()).toString() + "] Error while saving raw row objects: ", err);
            } else {
                winston.info("✅  [" + (new Date()).toString() + "] Saved raw row objects.");
            }
            fn(err, result);
        });
    });
};
////////////////////////////////////////////////////////////////////////////////
// Public - Imperatives - BulkWrite
//
constructor.prototype.InsertManyPersistableObjectTemplates = function(ordered_persistableObjectTemplateUIDs, persistableObjectTemplatesByUID, srcDocPKey, srcDocTitle, fn)
{ // fn: (err, [Schema.Types.ObjectId])
    var self = this;

    var num_parsed_orderedRowObjectPrimaryKeys = ordered_persistableObjectTemplateUIDs.length;
    winston.info("📡  [" + (new Date()).toString() + "] Inserting " + num_parsed_orderedRowObjectPrimaryKeys + " parsed rows for \"" + srcDocTitle + "\".");

    var forThisDataSource_mongooseContext = self.Lazy_Shared_RawRowObject_MongooseContext(srcDocPKey);
    var forThisDataSource_RawRowObject_scheme = forThisDataSource_mongooseContext.forThisDataSource_RawRowObject_scheme;
    var forThisDataSource_rowObjects_modelName = forThisDataSource_mongooseContext.forThisDataSource_rowObjects_modelName;
    var forThisDataSource_RawRowObject_model = forThisDataSource_mongooseContext.forThisDataSource_RawRowObject_model;
    //
    mongoose_client.WhenMongoDBConnected(function()
    { // ^ we block because we're going to work with the native connection; Mongoose doesn't block til connected for any but its own managed methods
        var nativeCollection = forThisDataSource_RawRowObject_model.collection;

        var updateDocs = [];
        for (var rowIdx = 0 ; rowIdx < ordered_persistableObjectTemplateUIDs.length; rowIdx++) {
            var rowUID = ordered_persistableObjectTemplateUIDs[rowIdx];

            updateDocs.push({
                insertOne: {document: persistableObjectTemplatesByUID[rowUID]}
            });
        }
        nativeCollection.bulkWrite(updateDocs, {ordered: false}, function(err, result){
            if (err) {
                winston.error("❌ [" + (new Date()).toString() + "] Error while saving raw row objects: ", err);
            } else {
                winston.info("✅  [" + (new Date()).toString() + "] Saved raw row objects.");
            }
            return fn(err, result);
        });
    });
};