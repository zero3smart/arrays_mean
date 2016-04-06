//
//
// 
const async = require("async");
const fs = require('fs');
const parse = require('csv-parse');
const winston = require('winston');

const import_datatypes = require('./import_datatypes');
const import_processing = require('./import_processing');
//
//
//
////////////////////////////////////////////////////////////////////////////////

var constructor = function(options, context)
{
    var self = this;
    self.options = options;
    self.context = context;
    
    self._init();
    
    return self;
}
module.exports = constructor;
constructor.prototype._init = function()
{
    var self = this;
    // winston.info("raw source documents controller is up")
};

//
constructor.prototype.Import_dataSourceDescriptions = function(dataSourceDescriptions)
{
    var self = this;
    var i = 1;
    async.eachSeries(dataSourceDescriptions, function(dataSourceDescription, callback)
    { // we wrap the function with this closure here so 'self' (this) is accessible within the called function
        self._dataSourceParsingAndImportingFunction(i, dataSourceDescription, callback);
        i++;
    }, function(err) 
    {
        if (err) {
            winston.info("❌  Error encountered during raw objects import:", err);
            process.exit(1); // error code
        } else {
            winston.info("✅  Raw objects import done. Proceeding to post-processing.");
            self._postProcessRawObjects(dataSourceDescriptions);
        }
    });
};
constructor.prototype._postProcessRawObjects = function(dataSourceDescriptions)
{
    var self = this;
    var i = 1;
    async.eachSeries(dataSourceDescriptions, function(dataSourceDescription, callback)
    {
        self._dataSourcePostProcessingFunction(i, dataSourceDescription, callback);
        i++;
    }, function(err)
    {
        if (err) {
            winston.info("❌  Error encountered during import post-processing:", err);
            process.exit(1); // error code
        } else {
            winston.info("✅  Import post-processing done.");
            process.exit(0); // all good
        }
    });
};
//
constructor.prototype._dataSourceParsingAndImportingFunction = function(indexInList, dataSourceDescription, callback)
{
    var self = this;
    var dataSource_uid = dataSourceDescription.uid;
    var dataSource_importRevision = dataSourceDescription.importRevision;
    var dataSource_title = dataSourceDescription.title;
    //
    var dataSourceRevision_pKey = self.context.raw_source_documents_controller.NewCustomPrimaryKeyStringWithComponents(dataSource_uid, dataSource_importRevision);
    var format = dataSourceDescription.format;
    switch (format) {
        case import_datatypes.DataSource_formats.CSV:
        {
            self._new_parsed_StringDocumentObject_fromCSVDataSourceDescription(indexInList, dataSourceDescription, dataSource_title, dataSourceRevision_pKey, function(err, stringDocumentObject)
            {
                if (err) {
                    callback(err);
                    return;
                }
                self.context.raw_source_documents_controller.UpsertWithOnePersistableObjectTemplate(stringDocumentObject, function(err, record)
                {
                    if (err) {
                        callback(err);
                        return;
                    }
                    winston.info("✅  Saved document: ", record._id);
                    callback(null);
                });
            });
            
            break;
        }
        default:
        {
            var errDescStr = "❌  Unrecognized data source format \"" + format + "\".";
            winston.error(errDescStr);
            callback(new Error(errDescStr)); // skip this one
            
            break;
        }
    }
};
//
constructor.prototype._new_parsed_StringDocumentObject_fromCSVDataSourceDescription = function(dataSourceIsIndexInList, csvDescription, sourceDocumentTitle, sourceDocumentRevisionKey, fn) 
{
    var self = this;
    //
    const CSV_resources_path_prefix = __dirname + "/resources";
    var filename = csvDescription.filename;
    var revisionNumber = csvDescription.importRevision;
    var importUID = csvDescription.uid;
    winston.info("🔁  " + dataSourceIsIndexInList + ": Importing CSV \"" + filename + "\"");
    var filepath = CSV_resources_path_prefix + "/" + filename;
    //
    var raw_rowObjects_coercionScheme = csvDescription.raw_rowObjects_coercionScheme; // look up data type scheme here
    // so we can do translation/mapping just below
    // winston.info("raw_rowObjects_coercionScheme " , raw_rowObjects_coercionScheme)
    //
    var parser = parse({ delimiter: ',' }, function(err, columnNamesAndThenRowObjectValues)
    { // Is it going to be a memory concern to hold entire large CSV files in memory?
        if (err) {
            // winston.info(err);
            fn(err, null);
            
            return;
        }
        var parsed_rowObjectsById = [];
        var parsed_orderedRowObjectPrimaryKeys = [];
        // 
        var columnNames = columnNamesAndThenRowObjectValues[0];
        var num_columnNames = columnNames.length;
        var columnNamesAndThenRowObjectValues_length = columnNamesAndThenRowObjectValues.length;
        var contentRowsStartingIndex_inParserFeed = 1;
        var num_actualContentRows = columnNamesAndThenRowObjectValues_length - contentRowsStartingIndex_inParserFeed;
        winston.info("🔁  Parsing " + num_actualContentRows + " rows in \"" + filename + "\"");
        for (var rowIndex_inParserFeed = contentRowsStartingIndex_inParserFeed ; rowIndex_inParserFeed < columnNamesAndThenRowObjectValues_length ; rowIndex_inParserFeed++) {
            var actualRowIndexInDataset = rowIndex_inParserFeed - contentRowsStartingIndex_inParserFeed;
            var rowObjectValues = columnNamesAndThenRowObjectValues[rowIndex_inParserFeed];
            if (rowObjectValues.length != num_columnNames) {
                winston.error("❌  Error: Row has different number of values than number of CSV's number of columns. Skipping: ", rowObjectValues);
                
                continue;
            }
            var rowObject = {};
            for (var columnIndex = 0 ; columnIndex < num_columnNames ; columnIndex++) {
                var columnName = "" + columnNames[columnIndex];
                var rowValue = rowObjectValues[columnIndex];
                //
                var typeFinalized_rowValue = rowValue;
                // now do type coercion/parsing here with functions to finalize
                if (raw_rowObjects_coercionScheme != null && typeof raw_rowObjects_coercionScheme !== 'undefined') {
                    var coercionSchemeForKey = raw_rowObjects_coercionScheme[columnName];
                    if (coercionSchemeForKey != null && typeof coercionSchemeForKey !== 'undefined') {
                        typeFinalized_rowValue = import_datatypes.NewDataTypeCoercedValue(coercionSchemeForKey, rowValue);
                    }
                }          
                rowObject[columnName] = typeFinalized_rowValue; // Now store the finalized value
            }
            var rowObject_primaryKey = csvDescription.fn_new_rowPrimaryKeyFromRowObject(rowObject, rowIndex_inParserFeed);
            if (typeof rowObject_primaryKey === 'undefined' || rowObject_primaryKey == null || rowObject_primaryKey == "") {
                winston.error("❌  Error: missing pkey on row", rowObject, "with factory accessor", csvDescription.fn_new_rowPrimaryKeyFromRowObject);

                return;
            }
            var parsedObject = self.context.raw_row_objects_controller.New_templateForPersistableObject(rowObject_primaryKey, sourceDocumentRevisionKey, actualRowIndexInDataset, rowObject);
            // winston.info("parsedObject " , parsedObject)
            if (parsed_rowObjectsById[rowObject_primaryKey] != null) {
                winston.info("‼️  Warning: An object with the same primary key, \"" 
                            + rowObject_primaryKey 
                            + "\" was already found in the parsed row objects cache on import." 
                            + " Use the primary key function to further disambiguate primary keys. Skipping importing this row, .");
                
                continue;
            }
            parsed_rowObjectsById[rowObject_primaryKey] = parsedObject;
            parsed_orderedRowObjectPrimaryKeys.push(rowObject_primaryKey);
        }
        var stringDocumentObject = self.context.raw_source_documents_controller.New_templateForPersistableObject(sourceDocumentRevisionKey, sourceDocumentTitle, revisionNumber, importUID, parsed_rowObjectsById, parsed_orderedRowObjectPrimaryKeys);
        stringDocumentObject.filename = filename;

        fn(null, stringDocumentObject);
    });
    // Now read
    var readStream = fs.createReadStream(filepath);
    readStream.on('error', function(err)
    {
        winston.error("❌  Error encountered while trying to open CSV file. The file might not yet exist or the specified filename might contain a typo.");
        fn(err, null);
    });
    readStream.on('readable', function()
    {
        readStream.pipe(parser);
    });
};
//
//
constructor.prototype._dataSourcePostProcessingFunction = function(indexInList, dataSourceDescription, callback)
{
    var self = this;
    var dataSource_uid = dataSourceDescription.uid;
    var dataSource_importRevision = dataSourceDescription.importRevision;    
    var dataSource_title = dataSourceDescription.title;
    //
    winston.info("🔁  " + indexInList + ": Post-processing \"" + dataSource_title + "\"");
    //
    var descriptionsOfFieldsToGenerate = dataSourceDescription.afterImportingAllSources_generate;
    async.eachSeries(descriptionsOfFieldsToGenerate, function(description, cb)
    {
        var generateFieldNamed = description.field;
        var isSingular = description.singular;
        var by = description.by;
        var byDoingOp = by.doing;
        switch (byDoingOp) {
            case import_processing.Ops.Join:
            {
                var onField = by.onField;
                var ofOtherRawSrcUID = by.ofOtherRawSrcUID;
                var andOtherRawSrcImportRevision = by.andOtherRawSrcImportRevision;
                var withLocalField = by.withLocalField;
                var obtainingValueFromField = by.obtainingValueFromField;
                self.context.processed_row_objects_controller.GenerateFieldsByJoining(dataSource_uid,
                                                                                     dataSource_importRevision,
                                                                                     dataSource_title,
                                                                                     generateFieldNamed, 
                                                                                     isSingular, 
                                                                                     onField,
                                                                                     ofOtherRawSrcUID,
                                                                                     andOtherRawSrcImportRevision,
                                                                                     withLocalField,
                                                                                     obtainingValueFromField,
                                                                                     cb);
                break;
            }
                
            default:
            {
                winston.error("❌  Unrecognized post-processing field generation operation \"" + byDoingOp + "\" in", description);
                break;
            }
        }        
    }, function(err)
    {
        if (err) {
            winston.error("❌  Error encountered while processing \"" + dataSource_title + "\".");
        } else {
            winston.info("✅  Done processing \"" + dataSource_title + "\.");
        }
        callback(err);
    });
};
//























