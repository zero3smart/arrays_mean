//
//
////////////////////////////////////////////////////////////////////////////////
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
        row_index: rowIndex,
        row_parameters: rowParameters
    }
}
//
const mongoose_client = require('../mongoose_client/mongoose_client')
const mongoose = mongoose_client.mongoose
const Schema = mongoose.Schema
//
//
var RawRowObject_scheme = Schema({
    primaryKey_withinThisRevision: String,
    dataSourceDocumentRevisionKey: String,
    rowIndexWithinSet: Number,
    rowParameters: Schema.Types.Mixed // be sure to call .markModified(path) on the model before saving if you update this Mixed property
})
RawRowObject_scheme.index({ primaryKey_withinThisRevision: 1, dataSourceDocumentRevisionKey: 1 }, { unique: true })
RawRowObject_scheme.index({ dataSourceDocumentRevisionKey: 1 }, { unique: false })
var modelName = 'RawRowObject'
var RawRowObject_model = mongoose.model(modelName, RawRowObject_scheme)
RawRowObject_model.on('index', function(error) 
{
    if (error != null) {
        console.log("❌  MongoDB index build error for '" + modelName + "':", error);
    } else {
        console.log("✅  Built indices for '" + modelName + "'")
    }
});
//
//
// Public - Imperatives - Upserts - Singular
//
constructor.prototype.UpsertWithOnePersistableObjectTemplate = function(persistableObjectTemplate,  fn)
{
    var self = this
    var persistableObjectTemplate_primaryKey_withinThisRevision = persistableObjectTemplate.primaryKey_withinThisRevision
    var persistableObjectTemplate_dataSourceDocumentRevisionKey = persistableObjectTemplate.dataSourceDocumentRevisionKey
    var updatedDocument = 
    {
        primaryKey_withinThisRevision: persistableObjectTemplate_primaryKey_withinThisRevision,
        dataSourceDocumentRevisionKey: persistableObjectTemplate_dataSourceDocumentRevisionKey,
        rowIndexWithinSet: persistableObjectTemplate.row_index,
        rowParameters: persistableObjectTemplate.row_parameters
    }
    //
    RawRowObject_model.findOneAndUpdate({
        primaryKey_withinThisRevision: persistableObjectTemplate_primaryKey_withinThisRevision,
        dataSourceDocumentRevisionKey: persistableObjectTemplate_dataSourceDocumentRevisionKey
    }, {
        $set: updatedDocument
    }, {
        new: true, 
        upsert: true
    }, function(err, doc)
    {
        if (err) {
            console.log("❌ Error while updating a raw row object: ", err);
        } else {
            console.log("✅  Saved raw row object with id", doc._id)
        }
        fn(err, doc)
    });
}
//
//
// Public - Imperatives - Upserts - Bulk
//
constructor.prototype.UpsertWithManyPersistableObjectTemplates = function(ordered_persistableObjectTemplateUIDs, persistableObjectTemplatesByUID, dataSourceDocumentRevisionKey, fn)
{ // fn: (err, [Schema.Types.ObjectId])
    var self = this
    // console.log("💬  Going to upsert " + ordered_persistableObjectTemplateUIDs.length + " ordered_persistableObjectTemplateUIDs")
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
            // fsync: true,
            // upsert: true
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
    RawRowObject_model.find(queryDescription).select(fieldsToSelect).exec(function(err, docs)
    {
        if (err) {
            console.log("❌ Error while retrieving raw row object ids: ", err);
            fn(err, null)
            
            return
        }
        // Now we must order them (unfortunately this is slow)
        var ordered_docs = docs.sort(function(doc1, doc2)
        {
            var doc1_primaryKey = doc1.primaryKey_withinThisRevision
            var doc2_primaryKey = doc2.primaryKey_withinThisRevision
            var idxOfDoc1PKeyInOrdering = ordered_primaryKeys_withinThisRevision.indexOf(doc1_primaryKey)
            var idxOfDoc2PKeyInOrdering = ordered_primaryKeys_withinThisRevision.indexOf(doc2_primaryKey)
            if (idxOfDoc1PKeyInOrdering == -1) {
                console.error("❌ Code Fault: idxOfDoc1PKeyInOrdering didn't exist in ordered_primaryKeys_withinThisRevision");
                
                return 0
            }
            if (idxOfDoc2PKeyInOrdering == -1) {
                console.error("❌ Code Fault: idxOfDoc2PKeyInOrdering didn't exist in ordered_primaryKeys_withinThisRevision");
                
                return 0
            }
            
            return idxOfDoc1PKeyInOrdering - idxOfDoc2PKeyInOrdering
        })
        var ordered_mongoIds = ordered_docs.map(function(element)
        { // aggregate ids
            return element._id
        })
        // console.log("ordered_mongoIds from ", ordered_mongoIds)
        
        fn(null, ordered_mongoIds)
    })    
}