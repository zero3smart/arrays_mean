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
    // console.log("raw string documents controller is up")
}

//
constructor.prototype.New_templateForPersistableObject = function(sourceDocumentRevisionKey, sourceDocumentTitle, revisionNumber, importUID, parsed_rowObjectsById, parsed_orderedRowObjectPrimaryKeys)
{
    return {
        primaryKey: sourceDocumentRevisionKey,
        title: sourceDocumentTitle,
        importUID: importUID,
        revisionNumber: revisionNumber,
        parsed_rowObjectsById: parsed_rowObjectsById,
        parsed_orderedRowObjectPrimaryKeys: parsed_orderedRowObjectPrimaryKeys
    }
}
//
const mongoose_client = require('../mongoose_client/mongoose_client')
const mongoose = mongoose_client.mongoose
const Schema = mongoose.Schema
//
var RawSourceDocument_scheme = Schema({
    primaryKey: { type: String, index: true }, // NOTE: This primaryKey is made by NewCustomPrimaryKeyStringWithComponents
    revisionNumber: Number,
    importUID: String,
    title: String,
    dateOfLastImport: Date,
    orderedRawRowObjects: [ { type: Schema.Types.ObjectId, ref: 'RawRowObject' } ]    
})
RawSourceDocument_scheme.index({ importUID: 1, revisionNumber: 1 }, { unique: true })
RawSourceDocument_scheme.index({ importUID: 1 }, { unique: false })
RawSourceDocument_scheme.index({ revisionNumber: 1 }, { unique: false })
constructor.prototype.Scheme = RawSourceDocument_scheme
//
var modelName = 'RawSourceDocument'
var RawSourceDocument_model = mongoose.model(modelName, RawSourceDocument_scheme)
RawSourceDocument_model.on('index', function(error) 
{
    if (error != null) {
        console.log("❌  MongoDB index build error for '" + modelName + "':", error);
    } else {
        console.log("✅  Built indices for '" + modelName + "'")
        // TODO: Don't let app start listening until indices built?
    }
});
constructor.prototype.Model = RawSourceDocument_model
//
//
// Public - Accessors - Factories - UIDs
//
constructor.prototype.NewCustomPrimaryKeyStringWithComponents = function(dataSource_uid, dataSource_importRevisionNumber)
{
    return dataSource_uid + "-rev" + dataSource_importRevisionNumber
}
//
//
// Public - Imperatives - Upserts
//
constructor.prototype.UpsertWithOnePersistableObjectTemplate = function(persistableObjectTemplate, fn)
{
    var self = this
    var persistableObjectTemplate_primaryKey = persistableObjectTemplate.primaryKey
    
    var raw_row_objects_controller = self.context.raw_row_objects_controller
    var parsed_orderedRowObjectPrimaryKeys = persistableObjectTemplate.parsed_orderedRowObjectPrimaryKeys
    var parsed_rowObjectsById = persistableObjectTemplate.parsed_rowObjectsById
    var revisionNumber = persistableObjectTemplate.revisionNumber
    var importUID = persistableObjectTemplate.importUID
    
    var num_parsed_orderedRowObjectPrimaryKeys = parsed_orderedRowObjectPrimaryKeys.length
    console.log("🔁  Upserting " + num_parsed_orderedRowObjectPrimaryKeys + " parsed rows for \"" + persistableObjectTemplate.title + "\".")
    
    // Bulk for performance at volume
    raw_row_objects_controller.UpsertWithManyPersistableObjectTemplates(parsed_orderedRowObjectPrimaryKeys, parsed_rowObjectsById, persistableObjectTemplate_primaryKey, function(err, ordered_rawRowObject_mongoIds)
    {
        if (err) {
            console.log("❌  Error: An error while saving raw row objects: ", err)
            
            return // bail
        }
        console.log("💬  Going to save document with " + ordered_rawRowObject_mongoIds.length + " row object mongoIds.")
        var persistableObjectTemplate_primaryKey = persistableObjectTemplate.primaryKey
        var updatedDocument = 
        {
            primaryKey: persistableObjectTemplate_primaryKey,
            title: persistableObjectTemplate.title,
            revisionNumber: revisionNumber,
            importUID: importUID,
            dateOfLastImport: new Date(),
            orderedRawRowObjects: ordered_rawRowObject_mongoIds // aggregated above
        }
        var findOneAndUpdate_queryParameters = {
            primaryKey: persistableObjectTemplate_primaryKey
        }
        RawSourceDocument_model.findOneAndUpdate(findOneAndUpdate_queryParameters, {
            $set: updatedDocument
        }, {
            new: true, 
            upsert: true
        }, function(err, doc)
        {
            if (err) {
                console.log("❌ Error while updating a raw source document: ", err);
            } else {
                console.log("✅  Saved raw source document object with id", doc._id)
            }
            fn(err, doc)
        });
    })
}