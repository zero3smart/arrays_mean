const mongoose_client = require('../mongoose_client/mongoose_client')
const Schema = mongoose_client.mongoose.Schema
//
//
var RawRowObject_scheme = Schema({
    primaryKey_withinThisRevision: String,
    dataSourceDocumentRevisionKey: String,
    rowIndexWithinSet: Number,
    rowParameters: Schema.Types.Mixed // be sure to call .markModified(path) on the model before saving if you update this Mixed property
})
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
