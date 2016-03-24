const async = require('async')
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
}
module.exports = constructor
constructor.prototype._init = function()
{
    var self = this;
    // console.log("raw row objects documents controller is up")
}
//
constructor.prototype.New_templateForPersistableObject = function(rowObject_primaryKey, sourceDocumentRevisionKey, rowIndex, rowParams)
{
    return {
        pKey: rowObject_primaryKey, // Queries to find this unique row will have to happen 
        srcDocPKey: sourceDocumentRevisionKey, // by pKey && srcDocPKey
        rowIdxInDoc: rowIndex,
        rowParams: rowParams
    }
}
//
const mongoose_client = require('../mongoose_client/mongoose_client')
const mongoose = mongoose_client.mongoose
const Schema = mongoose.Schema
//
//
constructor.prototype.New_RowObjectsCollectionName = function(srcDocPKey)
{
    return 'RawRowObjects-' + srcDocPKey
}
constructor.prototype.MongooseContextsBySrcDocPKey = {}
constructor.prototype.New_RawRowObject_MongooseContext = function(srcDocPKey)
{
    var self = this
    //
    var mongooseContext = self.MongooseContextsBySrcDocPKey[srcDocPKey]
    if (mongooseContext && typeof mongooseContext !== 'undefined') { // lazy cache, to avoid mongoose model re-definition error
        return mongooseContext
    }
    //
    var forThisDataSource_RawRowObject_scheme = Schema({
        pKey: String,
        srcDocPKey: String,
        rowIdxInDoc: Number,
        rowParams: Schema.Types.Mixed // be sure to call .markModified(path) on the model before saving if you update this Mixed property
    })
    forThisDataSource_RawRowObject_scheme.index({ pKey: 1, srcDocPKey: 1 }, { unique: true })
    forThisDataSource_RawRowObject_scheme.index({ srcDocPKey: 1 }, { unique: false })
    //
    var forThisDataSource_rowObjects_modelName = self.New_RowObjectsCollectionName(srcDocPKey)
    var forThisDataSource_RawRowObject_model = mongoose.model(forThisDataSource_rowObjects_modelName, forThisDataSource_RawRowObject_scheme)
    //
    mongooseContext = 
    {
        forThisDataSource_RawRowObject_scheme: forThisDataSource_RawRowObject_scheme,
        forThisDataSource_rowObjects_modelName: forThisDataSource_rowObjects_modelName,
        forThisDataSource_RawRowObject_model: forThisDataSource_RawRowObject_model
    }
    self.MongooseContextsBySrcDocPKey[srcDocPKey] = mongooseContext
    
    return mongooseContext
}
//
//
////////////////////////////////////////////////////////////////////////////////
// Public - Imperatives - Upserts - Bulk
//
constructor.prototype.UpsertWithManyPersistableObjectTemplates = function(ordered_persistableObjectTemplateUIDs, persistableObjectTemplatesByUID, srcDocPKey, fn)
{ // fn: (err, [Schema.Types.ObjectId])
    var self = this
    // console.log("💬  Going to upsert " + ordered_persistableObjectTemplateUIDs.length + " ordered_persistableObjectTemplateUIDs")
    //
    var forThisDataSource_mongooseContext = self.New_RawRowObject_MongooseContext(srcDocPKey)
    var forThisDataSource_RawRowObject_scheme = forThisDataSource_mongooseContext.forThisDataSource_RawRowObject_scheme
    var forThisDataSource_rowObjects_modelName = forThisDataSource_mongooseContext.forThisDataSource_rowObjects_modelName
    var forThisDataSource_RawRowObject_model = forThisDataSource_mongooseContext.forThisDataSource_RawRowObject_model
    //
    mongoose_client.BlockUntilMongoDBConnected(function()
    { // ^ we block because we're going to work with the native connection; Mongoose doesn't block til connected for any but its own managed methods
        var nativeCollection = forThisDataSource_RawRowObject_model.collection
        var bulkOperation = nativeCollection.initializeUnorderedBulkOp()
        var num_ordered_persistableObjectTemplateUIDs = ordered_persistableObjectTemplateUIDs.length
                
        for (var rowIdx = 0 ; rowIdx < num_ordered_persistableObjectTemplateUIDs ; rowIdx++) {            
            var rowUID = ordered_persistableObjectTemplateUIDs[rowIdx]
            var persistableObjectTemplate = persistableObjectTemplatesByUID[rowUID]
            var persistableObjectTemplate_pKey = persistableObjectTemplate.pKey
            var persistableObjectTemplate_srcDocPKey = persistableObjectTemplate.srcDocPKey
            var bulkOperationQueryFragment = 
            {
                pKey: persistableObjectTemplate_pKey,
                srcDocPKey: srcDocPKey
            }
            bulkOperation.find(bulkOperationQueryFragment).upsert().update({ $set: persistableObjectTemplate })
        }
        var writeConcern =
        {
            upsert: true,
            j: true // 'requests acknowledgement from MongoDB that the write operation has been written to the journal'
        }
        bulkOperation.execute(writeConcern, function(err, result)
        {
            if (err) {
                console.log("❌ Error while saving raw row objects: ", err);
                fn(err, null)
                
                return
            }
            console.log("✅  Saved raw row objects.")
            self._new_orderedMongoIds_fromOrderedCompoundKeyComponents(forThisDataSource_RawRowObject_model, ordered_persistableObjectTemplateUIDs, srcDocPKey, function(err, ordered_mongoIds)
            {
                if (err) {
                    return // early
                }
                // console.log("💬  Aggregated " + ordered_mongoIds.length + " row object ordered_mongoIds.")
                fn(null, ordered_mongoIds)
            })        
        })
    })
}
//
//
////////////////////////////////////////////////////////////////////////////////
// Private - Accessors - Factories - Obtaining MongoIds
//
constructor.prototype._new_orderedMongoIds_fromOrderedCompoundKeyComponents = function(forThisDataSource_RawRowObject_model, ordered_primaryKeys_withinThisRevision, srcDocPKey, fn) 
{ // -> [Schema.Types.ObjectId]    
    
    var queryDescription = 
    {
        pKey: {
            $in: ordered_primaryKeys_withinThisRevision
        },
        srcDocPKey: srcDocPKey
    }
    var fieldsToSelect = 
    { 
        pKey: 1, 
        _id: 1
    }
    console.log("🔁  Querying for mongoIds of row objects.")
    
    
    // TODO: Use the aggregate pipeline to optimize this whole function
    
    
    forThisDataSource_RawRowObject_model.find(queryDescription).select(fieldsToSelect).exec(function(err, docs)
    {
        if (err) {
            console.log("❌ Error while retrieving raw row object ids: ", err);
            fn(err, null)
            
            return
        }
        console.log("🔁  Sorting mongoIds of row objects.")
        // Now we must order them (unfortunately this is slow which is why we use async instead of Array.sort)
        async.sortBy(docs, function(doc, cb)
        {
            var doc_primaryKey = doc.pKey
            var idxOfDocPKeyInOrdering = ordered_primaryKeys_withinThisRevision.indexOf(doc_primaryKey)
            if (idxOfDocPKeyInOrdering == -1) {
                var errStr = "❌ Code Fault: idxOfDocPKeyInOrdering didn't exist in ordered_primaryKeys_withinThisRevision"
                var err = new Error(errStr)
                console.error(errStr);
                
                cb(err, 0)
                return
            }
            cb(null, idxOfDocPKeyInOrdering)
        }, function(err, ordered_docs) 
        {
            if (err) {
                fn(err, null)
                return
            }
            console.log("🔁  Aggregating mongoIds of row objects.")
            async.map(ordered_docs, function(doc, cb) // Another optimization via async
            { // aggregate ids
                cb(null, doc._id)
            }, function(err, ordered_mongoIds)
            {
                if (err) {
                    fn(err, null)
                    return
                }
                // console.log("ordered_mongoIds from ", ordered_mongoIds)
        
                fn(null, ordered_mongoIds)
            });
        })
    })    
}