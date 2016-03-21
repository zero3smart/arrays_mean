
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
    // console.log("raw string documents controller is up")
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
//
constructor.prototype.ImportAndPersistTemplateForPersistableObject = function(persistableObjectTemplate, fn)
{
    console.log("persist ", Object.keys(persistableObjectTemplate))
            // TODO: put these into mongo asynchronously(.. concurrently, too?)
            // Do a find & update or create by primaryKey + sourceDocumentRevisionKey
            // However, on re-import, flash parsedRawRowObjects_primaryKeys and thus parse on stringDocumentObject in case rows change
    
    fn(null, null)
}