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
constructor.prototype.New_templateForPersistableObject = function(rowObject_primaryKey, sourceDocumentRevisionKey, rowIndex, rowParameters)
{
    return {
        primaryKey_withinThisRevision: rowObject_primaryKey, // Queries to find this unique row will have to happen 
        dataSourceDocumentRevisionKey: sourceDocumentRevisionKey, // by primaryKey_withinThisRevision && dataSourceDocumentRevisionKey
        rowIndexWithinSet: rowIndex,
        rowParameters: rowParameters
    }
}
//
const mongoose_client = require('../mongoose_client/mongoose_client')
const mongoose = mongoose_client.mongoose
const Schema = mongoose.Schema
//
//
constructor.prototype.New_RowObjectsCollectionName = function(dataSourceDocumentRevisionKey)
{
    return 'RawRowObjects-' + dataSourceDocumentRevisionKey
}
//
//
////////////////////////////////////////////////////////////////////////////////
// Public - Imperatives - Upserts - Bulk
//
constructor.prototype.UpsertWithManyPersistableObjectTemplates = function(ordered_persistableObjectTemplateUIDs, persistableObjectTemplatesByUID, dataSourceDocumentRevisionKey, fn)
{ // fn: (err, [Schema.Types.ObjectId])
    var self = this
    // console.log("💬  Going to upsert " + ordered_persistableObjectTemplateUIDs.length + " ordered_persistableObjectTemplateUIDs")


    //
    //
    var forThisDataSource_RawRowObject_scheme = Schema({
        primaryKey_withinThisRevision: String,
        dataSourceDocumentRevisionKey: String,
        rowIndexWithinSet: Number,
        rowParameters: Schema.Types.Mixed // be sure to call .markModified(path) on the model before saving if you update this Mixed property
    })
    forThisDataSource_RawRowObject_scheme.index({ primaryKey_withinThisRevision: 1, dataSourceDocumentRevisionKey: 1 }, { unique: true })
    forThisDataSource_RawRowObject_scheme.index({ dataSourceDocumentRevisionKey: 1 }, { unique: false })
    //
    var forThisDataSource_rowObjects_modelName = self.New_RowObjectsCollectionName(dataSourceDocumentRevisionKey)
    var forThisDataSource_RawRowObject_model = mongoose.model(forThisDataSource_rowObjects_modelName, forThisDataSource_RawRowObject_scheme)

    //
    mongoose_client.BlockUntilMongoDBConnected(function()
    { // ^ we block because we're going to work with the native connection; Mongoose doesn't block til connected for any but its own managed methods
        var nativeCollection = RawRowObject_model.collection
        var bulkOperation = nativeCollection.initializeUnorderedBulkOp()
        var num_ordered_persistableObjectTemplateUIDs = ordered_persistableObjectTemplateUIDs.length
                
        for (var rowIdx = 0 ; rowIdx < num_ordered_persistableObjectTemplateUIDs ; rowIdx++) {            
            var rowUID = ordered_persistableObjectTemplateUIDs[rowIdx]
            var persistableObjectTemplate = persistableObjectTemplatesByUID[rowUID]
            var persistableObjectTemplate_primaryKey_withinThisRevision = persistableObjectTemplate.primaryKey_withinThisRevision
            var persistableObjectTemplate_dataSourceDocumentRevisionKey = persistableObjectTemplate.dataSourceDocumentRevisionKey
            var bulkOperationQueryFragment = 
            {
                primaryKey_withinThisRevision: persistableObjectTemplate_primaryKey_withinThisRevision,
                dataSourceDocumentRevisionKey: dataSourceDocumentRevisionKey
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
            self._new_orderedMongoIds_fromOrderedCompoundKeyComponents(ordered_persistableObjectTemplateUIDs, dataSourceDocumentRevisionKey, function(err, ordered_mongoIds)
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
constructor.prototype._new_orderedMongoIds_fromOrderedCompoundKeyComponents = function(ordered_primaryKeys_withinThisRevision, dataSourceDocumentRevisionKey, fn) 
{ // -> [Schema.Types.ObjectId]    
    
    var queryDescription = 
    {
        primaryKey_withinThisRevision: {
            $in: ordered_primaryKeys_withinThisRevision
        },
        dataSourceDocumentRevisionKey: dataSourceDocumentRevisionKey
    }
    var fieldsToSelect = 
    { 
        primaryKey_withinThisRevision: 1, 
        _id: 1
    }
    console.log("🔁  Querying for mongoIds of row objects.")
    RawRowObject_model.find(queryDescription).select(fieldsToSelect).exec(function(err, docs)
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
            var doc_primaryKey = doc.primaryKey_withinThisRevision
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