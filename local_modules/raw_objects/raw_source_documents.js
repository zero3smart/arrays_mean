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
    var raw_row_objects_controller = self.context.raw_row_objects_controller
    var parsed_orderedRowObjectPrimaryKeys = persistableObjectTemplate.parsed_orderedRowObjectPrimaryKeys
    var parsed_rowObjectsById = persistableObjectTemplate.parsed_rowObjectsById
    var ordered_rawRowObject_mongoIds = []
    // TODO: replace this with a bulk upsert:
    var num_parsed_orderedRowObjectPrimaryKeys = parsed_orderedRowObjectPrimaryKeys.length
    console.log("🔁  Upserting " + num_parsed_orderedRowObjectPrimaryKeys + " parsed rows for \"" + persistableObjectTemplate.title + "\".")
    
    async.each(parsed_orderedRowObjectPrimaryKeys, function(rowObjectId, callback)
    {
        var rowObject = parsed_rowObjectsById[rowObjectId]
        // console.log("Row object ", rowObjectId, rowObject)
        raw_row_objects_controller.UpsertWithOnePersistableObjectTemplate(rowObject, function(err, rawRowObject)
        {
            if (err) {
                console.log("❌  Error: An error while processing a row object: ", err)
                callback(err)
            
                return
            }
            ordered_rawRowObject_mongoIds.push(rawRowObject._id)
            callback(null)
        })
    }, function(err) 
    {
        if (err) {
            console.log("❌  Error: Raw row object processing error: ", err)
            fn(err, null)
    
            return // early
        }
        console.log("Number of ordered_rawRowObject_mongoIds: " , ordered_rawRowObject_mongoIds.length)
        var persistableObjectTemplate_primaryKey = persistableObjectTemplate.primaryKey
        //
        var updatedDocument = 
        {
            primaryKey: persistableObjectTemplate_primaryKey,
            title: persistableObjectTemplate.title,
            dateOfLastImport: new Date(),
            orderedRawRowObjects: ordered_rawRowObject_mongoIds // aggregated above
        }
        //
        RawSourceDocument_model.findOneAndUpdate({
            primaryKey: persistableObjectTemplate_primaryKey
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
                console.log("✅  Saved raw source document object with id", doc._id)
            }
            fn(err, doc)
        });  
    })
}