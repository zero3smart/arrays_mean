
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
constructor.prototype.New_templateForPersistableObject = function(sourceDocumentRevisionKey, sourceDocumentTitle, parsed_rowObjects, parsed_rowObjectPrimaryKeys)
{
    return {
        primaryKey: sourceDocumentRevisionKey,
        title: sourceDocumentTitle,
        dateOfLastImport: new Date(),
        parsed_rowObjects: parsed_rowObjects,
        parsed_rowObjectPrimaryKeys: parsed_rowObjectPrimaryKeys
    }
}


//
//
// function New_templateFor_parsed_DocumentObject(sourceDocumentRevisionKey, sourceDocumentTitle, parsed_rowObjects, parsed_rowObjectPrimaryKeys)
// {
//     return {
//         primaryKey: sourceDocumentRevisionKey,
//         title: sourceDocumentTitle,
//         date_of_import: new Date(),
//         parsed_rowObjects: parsed_rowObjects,
//         parsed_rowObjectPrimaryKeys: parsed_rowObjectPrimaryKeys
//     }
// }