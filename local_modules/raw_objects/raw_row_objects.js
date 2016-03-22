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
// Singular:
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
// Plural/Bulk:
constructor.prototype.UpsertWithManyPersistableObjectTemplates = function(ordered_persistableObjectTemplateUIDs, persistableObjectTemplatesByUID, fn)
{ // fn: (err, )
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
                dataSourceDocumentRevisionKey: persistableObjectTemplate_dataSourceDocumentRevisionKey
            }
            bulkOperation.find(bulkOperationQueryFragment).upsert().update({ $set: persistableObjectTemplate });
        }
        var writeConcern = 
        {
            fsync: true
        }
        bulkOperation.execute(writeConcern, function(err, result)
        {
            if (err) {
                console.log("❌ Error while saving raw row objects: ", err);
                fn(err, null)
                
                return
            }
            console.log("✅  Saved raw row objects.")
            console.log("💬  Bulk upsert result ", JSON.stringify(result, true, '\t'))
        
            var ordered_rawRowObject_mongoIds = [] // TODO: obtain these
        })
    })
}
//