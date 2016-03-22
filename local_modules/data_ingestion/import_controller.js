//
//
// 
const async = require("async")
const fs = require('fs')
const parse = require('csv-parse')

const import_datatypes = require('./import_datatypes')
//
//
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
    // console.log("raw source documents controller is up")
}

//
constructor.prototype.Import_dataSourceDescriptions = function(dataSourceDescriptions)
{
    var self = this
    async.each(dataSourceDescriptions, function(dataSourceDescription, callback)
    { // we wrap the function with this closure here so 'self' (this) is accessible within the called function
        self._dataSourceParsingAndImportingFunction(dataSourceDescription, callback) 
    }, function(err) 
    {
        if (err) {
            console.log("❌  Error encountered:", err)
            process.exit(1) // error code
        } else {
            console.log("✅  Import done.")
            process.exit(0) // all good
        }
    });
}

constructor.prototype._dataSourceParsingAndImportingFunction = function(dataSourceDescription, callback)
{
    var self = this
    var dataSource_uid = dataSourceDescription.uid
    var dataSource_import_revision = dataSourceDescription.import_revision
    var dataSource_title = dataSourceDescription.title
    //
    // Generated    
    var dataSourceRevision_pKey = self.context.raw_source_documents_controller.NewCustomPrimaryKeyStringWithComponents(dataSource_uid, dataSource_import_revision)
    var format = dataSourceDescription.format
    switch (format) {
        case import_datatypes.DataSource_formats.CSV:
            self._new_parsed_StringDocumentObject_fromCSVDataSourceDescription(dataSourceDescription, dataSource_title, dataSourceRevision_pKey, function(err, stringDocumentObject)
            {
                if (err) {
                    callback(err)
                    return
                }
                self.context.raw_source_documents_controller.UpsertWithOnePersistableObjectTemplate(stringDocumentObject, function(err, record)
                {
                    if (err) {
                        callback(err)
                        return
                    }
                    console.log("✅  Saved document: ", record._id)
                    callback(null)
                })
            })
            
            break        
        default:
            var errDescStr = "❌  Unrecognized data source format \"" + format + "\"."
            console.error(errDescStr);
            callback(new Error(errDescStr)); // skip this one
    }
}
//
constructor.prototype._new_parsed_StringDocumentObject_fromCSVDataSourceDescription = function(csvDescription, sourceDocumentTitle, sourceDocumentRevisionKey, fn) 
{
    var self = this
    //
    const CSV_resources_path_prefix = __dirname + "/resources"
    var filename = csvDescription.filename
    var revisionNumber = csvDescription.import_revision
    var importUID = csvDescription.uid
    console.log("💬  Will import \"" + filename + "\"")
    var filepath = CSV_resources_path_prefix + "/" + filename   
    //
    var raw_rowObjects_coercionScheme = csvDescription.raw_rowObjects_coercionScheme // look up data type scheme here
    // so we can do translation/mapping just below
    // console.log("raw_rowObjects_coercionScheme " , raw_rowObjects_coercionScheme)
    //
    var parser = parse({ delimiter: ',' }, function(err, columnNamesAndThenRowObjectValues)
    { // Is it going to be a memory concern to hold entire large CSV files in memory?
        if (err) {
            // console.log(err);
            fn(err, null)
            
            return
        }
        console.log("💬  Opened \"" + filename + "\"")
        var parsed_rowObjectsById = []
        var parsed_orderedRowObjectPrimaryKeys = []
        // 
        var columnNames = columnNamesAndThenRowObjectValues[0]
        var num_columnNames = columnNames.length
        var columnNamesAndThenRowObjectValues_length = columnNamesAndThenRowObjectValues.length
        var contentRowsStartingIndex_inParserFeed = 1
        for (var rowIndex_inParserFeed = contentRowsStartingIndex_inParserFeed ; rowIndex_inParserFeed < columnNamesAndThenRowObjectValues_length ; rowIndex_inParserFeed++) {
            var actualRowIndexInDataset = rowIndex_inParserFeed - contentRowsStartingIndex_inParserFeed
            var rowObjectValues = columnNamesAndThenRowObjectValues[rowIndex_inParserFeed]
            if (rowObjectValues.length != num_columnNames) {
                console.error("❌  Error: Row has different number of values than number of CSV's number of columns. Skipping: ", rowObjectValues)
                
                continue
            }
            var rowObject = {}
            for (var columnIndex = 0 ; columnIndex < num_columnNames ; columnIndex++) {
                var columnName = "" + columnNames[columnIndex]
                var rowValue = rowObjectValues[columnIndex]
                //
                var typeFinalized_rowValue = rowValue 
                // now do type coercion/parsing here with functions to finalize
                if (raw_rowObjects_coercionScheme != null && typeof raw_rowObjects_coercionScheme !== 'undefined') {
                    var coercionSchemeForKey = raw_rowObjects_coercionScheme[columnName]
                    if (coercionSchemeForKey != null && typeof coercionSchemeForKey !== 'undefined') {
                        typeFinalized_rowValue = import_datatypes.NewDataTypeCoercedValue(coercionSchemeForKey, rowValue)
                    }
                }          
                rowObject[columnName] = typeFinalized_rowValue // Now store the finalized value
            }
            var rowObject_primaryKey = csvDescription.fn_new_rowPrimaryKeyFromRowObject(rowObject, rowIndex_inParserFeed)
            if (typeof rowObject_primaryKey === 'undefined' || rowObject_primaryKey == null || rowObject_primaryKey == "") {
                console.error("❌  Error: missing pkey on row", rowObject, "with factory accessor", csvDescription.fn_new_rowPrimaryKeyFromRowObject)

                return
            }
            var parsedObject = self.context.raw_row_objects_controller.New_templateForPersistableObject(rowObject_primaryKey, sourceDocumentRevisionKey, actualRowIndexInDataset, rowObject)
            // console.log("parsedObject " , parsedObject)
            if (parsed_rowObjectsById[rowObject_primaryKey] != null) {
                console.log("‼️  Warning: An object with the same primary key, \"" 
                            + rowObject_primaryKey 
                            + "\" was already found in the parsed row objects cache on import." 
                            + " Use the primary key function to further disambiguate primary keys. Skipping importing this row, .")
                
                continue
            }
            parsed_rowObjectsById[rowObject_primaryKey] = parsedObject
            parsed_orderedRowObjectPrimaryKeys.push(rowObject_primaryKey)
        }
        var stringDocumentObject = self.context.raw_source_documents_controller.New_templateForPersistableObject(sourceDocumentRevisionKey, sourceDocumentTitle, revisionNumber, importUID, parsed_rowObjectsById, parsed_orderedRowObjectPrimaryKeys)
        stringDocumentObject.filename = filename

        fn(null, stringDocumentObject)
    })
    // Now read
    var readStream = fs.createReadStream(filepath)
    readStream.on('error', function(err)
    {
        console.error("❌  Error encountered while trying to open CSV file. The file might not yet exist or the specified filename might contain a typo.")
        fn(err, null)
    })
    readStream.on('readable', function()
    {
        readStream.pipe(parser)
    })
}
//