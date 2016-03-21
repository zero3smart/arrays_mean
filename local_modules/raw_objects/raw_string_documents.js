
//
////////////////////////////////////////////////////////////////////////////////

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
    console.log("raw string documents controller is up")
}

//
constructor.prototype.New_templateForPersistableObject = function(sourceDocumentRevisionKey, sourceDocumentTitle, parsed_rowObjectsById, parsed_orderedRowObjectPrimaryKeys)
{
    return {
        primaryKey: sourceDocumentRevisionKey,
        title: sourceDocumentTitle,
        dateOfLastImport: new Date(),
        parsed_rowObjectsById: parsed_rowObjectsById,
        parsed_orderedRowObjectPrimaryKeys: parsed_orderedRowObjectPrimaryKeys
    }
}
