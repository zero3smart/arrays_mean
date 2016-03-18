const async = require("async")
const fs = require('fs');
const parse = require('csv-parse');

// NOTE: Run this from arrays-server-js via bin/_*_MVP_CSV_DB_seed
//
// 
var DataSourceFormats = 
{
    CSV: "csv"
}
//
var dataSourceDescriptions = 
[
    {
        filename: "NewOrleans_High_Wage_Jobs__2009_-_Present_.csv",
        uid: "NewOrleans_High_Wage_Jobs__2009_-_Present_.csv",
        import_revision: 1,
        format: DataSourceFormats.CSV,
        title: "New Orleans High Wage Jobs, 2009 - Present",
        fn_new_rowPrimaryKeyFromRowObject: function(rowObject) {
            return rowObject["RowID"] // TODO: This does not appear to actually be unique for this dataset. Maybe we want to add a counter; where to store counter? pass in context for doc parse?
        }
    }    
]
async.each(dataSourceDescriptions, _dataSourceParsingFunction, function(err) 
{
    console.log("✅  Done.")
});
function _dataSourceParsingFunction(dataSourceDescription, callback)
{
    
    var dataSource_uid = dataSourceDescription.uid
    var dataSource_import_revision = dataSourceDescription.import_revision
    
    // Generated    
    var dataSourceRevision_pKey = dataSource_uid+"-rev"+dataSource_import_revision

    var dataSource_title = dataSourceDescription.title
    
    var format = dataSourceDescription.format
    switch (format) {
        case DataSourceFormats.CSV:
            _new_parsed_StringDocumentObject_fromCSVDataSourceDescription(dataSourceDescription, dataSource_title, dataSourceRevision_pKey, function(err, stringDocumentObject)
            {
                if (err) {
                    callback(err)
                    return
                }
                console.log("📌  TODO: Now persist string document object", stringDocumentObject)
                
                callback()
            })
            
            break;
            
        default:
            var errDescStr = "❌  Unrecognized data source format \"" + format + "\"."
            console.error(errDescStr);
            callback(new Error(errDescStr)); // skip this one
    }
}

function __new_templateFor_parsed_DocumentObject(sourceDocumentRevisionKey, sourceDocumentTitle, parsed_rowObjects)
{
    return {
        primaryKey: sourceDocumentRevisionKey,
        title: sourceDocumentTitle,
        parsed_rowObjects: parsed_rowObjects
    }
}

function _new_parsed_StringDocumentObject_fromCSVDataSourceDescription(csvDescription, sourceDocumentTitle, sourceDocumentRevisionKey, fn) 
{
    var filename = csvDescription.filename
    const CSV_resources_path_prefix = __dirname + "/resources"
    var filepath = CSV_resources_path_prefix + "/" + filename    
    
    // todo: look up data type scheme here so we can do translation/mapping just below
    

    var parser = parse({delimiter: ','}, function(err, columnNamesAndThenRowObjectValues)
    {
        // console.log(columnNamesAndThenRowObjectValues);
        var parsed_rowObjects = []
        // 
        var columnNames = columnNamesAndThenRowObjectValues[0]
        var num_columnNames = columnNames.length
        var num_rows = columnNamesAndThenRowObjectValues.length - 1
        for (var i = 1 ; i < num_rows ; i++) {
            var rowObjectValues = columnNamesAndThenRowObjectValues[i]
            if (rowObjectValues.length != num_columnNames) {
                console.error("❌  Row has different number of values than number of CSV's number of columns. Skipping: ", rowObjectValues)
                continue
            }
            var rowObject = {}
            for (var j = 0 ; j < num_columnNames ; j++) {
                var columnName = columnNames[j]
                var rowValue = rowObjectValues[j]
              
                var typeFinalized_rowValue = rowValue // TODO: do type coersion/parsing here with functions
              
                rowObject["" + columnName] = typeFinalized_rowValue
            }
            var rowObject_primaryKey = csvDescription.fn_new_rowPrimaryKeyFromRowObject(rowObject)
            if (typeof rowObject_primaryKey === 'undefined' || rowObject_primaryKey == null || rowObject_primaryKey == "") {
                console.error("Error: missing pkey on row", rowObject, "with factory accessor", csvDescription.fn_new_rowPrimaryKeyFromRowObject)

                return
            }
            var parsedObject =
            {
                primaryKey: rowObject_primaryKey,
                dataSourceDocumentRevisionKey: sourceDocumentRevisionKey,
                row_parameters: rowObject
            }
            parsed_rowObjects.push(parsedObject)
        }
        var stringDocumentObject = __new_templateFor_parsed_DocumentObject(sourceDocumentRevisionKey, sourceDocumentTitle, parsed_rowObjects)
        stringDocumentObject.filename = filename

        fn(null, stringDocumentObject)
    });
    fs.createReadStream(filepath).pipe(parser);
}