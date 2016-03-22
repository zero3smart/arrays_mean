const async = require('async')
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
    // console.log("raw string documents controller is up")
}

//
constructor.prototype.New_templateForPersistableObject = function(sourceDocumentRevisionKey, sourceDocumentTitle, parsed_rowObjectsById, parsed_orderedRowObjectPrimaryKeys)
{
    return {
        primaryKey: sourceDocumentRevisionKey,
        title: sourceDocumentTitle,
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
    primaryKey: { type: String, index: true},
    title: String,
    dateOfLastImport: Date,
    orderedRawRowObjects: [ { type: Schema.Types.ObjectId, ref: 'RawRowObject' } ]    
})
var modelName = 'RawRawSourceDocument'
var RawSourceDocument_model = mongoose.model(modelName, RawSourceDocument_scheme)
RawSourceDocument_model.on('index', function(error) 
{
    if (error != null) {
        console.log("❌  MongoDB index build error for '" + modelName + "':", error);
    } else {
        console.log("✅  Built indices for '" + modelName + "'")
    }
});
//
//
constructor.prototype.UpsertWithOnePersistableObjectTemplate = function(persistableObjectTemplate, fn)
{
    var self = this
    var persistableObjectTemplate_primaryKey = persistableObjectTemplate.primaryKey
    
    var raw_row_objects_controller = self.context.raw_row_objects_controller
    var parsed_orderedRowObjectPrimaryKeys = persistableObjectTemplate.parsed_orderedRowObjectPrimaryKeys
    var parsed_rowObjectsById = persistableObjectTemplate.parsed_rowObjectsById

    var num_parsed_orderedRowObjectPrimaryKeys = parsed_orderedRowObjectPrimaryKeys.length
    console.log("🔁  Upserting " + num_parsed_orderedRowObjectPrimaryKeys + " parsed rows for \"" + persistableObjectTemplate.title + "\".")
    
    // Bulk for performance at volume
    raw_row_objects_controller.UpsertWithManyPersistableObjectTemplates(parsed_orderedRowObjectPrimaryKeys, parsed_rowObjectsById, persistableObjectTemplate_primaryKey, function(err, ordered_rawRowObject_mongoIds)
    {
        if (err) {
            console.log("❌  Error: An error while saving raw row objects: ", err)
            
            return // bail
        }
        console.log("Going to save document with " + ordered_rawRowObject_mongoIds.length + " row object mongoIds.")
        var persistableObjectTemplate_primaryKey = persistableObjectTemplate.primaryKey
        var updatedDocument = 
        {
            primaryKey: persistableObjectTemplate_primaryKey,
            title: persistableObjectTemplate.title,
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