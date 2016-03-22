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
var RawRowObject_model = mongoose.model('RawRowObject', RawRowObject_scheme)
var native_RawRowObject_collection = RawRowObject_model.collection
//
constructor.prototype.CreateOrUpdateWithTemplateForPersistableObject = function(persistableObjectTemplate,  fn)
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
            console.log("❌ Error while updating a raw source document: ", err);
        } else {
            console.log("✅  Saved raw row object with id", doc._id)
        }
        fn(err, doc)
    });
}