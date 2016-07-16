//
//
// 
var async = require("async");
var fs = require('fs');
var parse = require('csv-parse');
var es = require('event-stream');
var winston = require('winston');

var import_datatypes = require('./import_datatypes');
var import_processing = require('./import_processing');
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
//
constructor.prototype.Import_dataSourceDescriptions = function(dataSourceDescriptions)
{
    var self = this;
    var i = 1;
    async.eachSeries(dataSourceDescriptions, function(dataSourceDescription, callback)
    { 
        self._dataSourceParsingAndImportingFunction(i, dataSourceDescription, callback);
        i++;
    }, function(err) 
    {
        if (err) {
            winston.info("❌  Error encountered during raw objects import:", err);
            process.exit(1); // error code
        } else {
            winston.info("✅  Raw objects import done. Proceeding to post-processing.");
            self._postProcessRawObjects(dataSourceDescriptions, function(err)
            {
                if (err) {
                    winston.info("❌  Error encountered during import post-processing:", err);
                    process.exit(1); // error code
                } else {
                    winston.info("✅  Import post-processing done.");

                    var omitImageScrapping = true; // set true to omit image scraping,

                    if (!omitImageScrapping) {
                        i = 1;
                        async.eachSeries(dataSourceDescriptions, function (dataSourceDescription, callback) {
                            self._proceedToScrapeImagesAndRemainderOfPostProcessing(i, dataSourceDescription, callback);
                            i++;
                        }, function (err) {

                            if (err) {

                                winston.info("❌  Error encountered during image-scrapping:(" + err.code + ')', err);
                                if (err.code == 'ECONNRESET' || err.code == 'ENOTFOUND' || err.code == 'ETIMEDOUT') {
                                    winston.info("💬  Waiting 3 seconds to restart...");
                                    setTimeout(function () {
                                        self._Import_dataSourceDescriptions__enteringImageScrapingDirectly(dataSourceDescriptions);
                                    }, 3000);
                                } else {
                                    process.exit(1); // error code
                                }

                            } else {

                                winston.info("✅  Image-scrapping done.");
                                process.exit(0); // all good

                            }
                        });
                    } else {
                        //
                        // Execute user-defined generalized post-processing pipeline since the image scrapping is omitted
                        //
                        i = 1;
                        async.eachSeries(dataSourceDescriptions, function (dataSourceDescription, callback) {
                            self._afterGeneratingProcessedDataSet_performEachRowOperations(i, dataSourceDescription, callback);
                            i ++;
                        }, function(err) {

                            if (err) {

                                winston.info("❌  Error encountered during performming each-row operations:(" + err.code + ')', err);
                                process.exit(1); // error code

                            } else {

                                winston.info("✅  All done.");
                                process.exit(0); // all good

                            }

                        });
                    }
                }
            });
        }
    });
};
//
constructor.prototype._Import_dataSourceDescriptions__enteringImageScrapingDirectly = function(dataSourceDescriptions)
{
    var self = this;
    var i = 1;
    async.eachSeries(dataSourceDescriptions, function(dataSourceDescription, callback)
    {
        winston.info("💬  " + i + ": Proceeding directly to image scraping and remainder of post-processing of \"" + dataSourceDescription.title + "\"");
        self._proceedToScrapeImagesAndRemainderOfPostProcessing(i, dataSourceDescription, callback);
        i++;
    }, function(err)
    {
        if (err) {
            winston.info("❌  Error encountered during image-scrapping:(" + err.code + ')', err);
            if (err.code == 'ECONNRESET' || err.code == 'ENOTFOUND' || err.code == 'ETIMEDOUT') {
                winston.info("💬  Waiting 3 seconds to restart...");
                setTimeout(function () {
                    self._Import_dataSourceDescriptions__enteringImageScrapingDirectly(dataSourceDescriptions);
                }, 3000);
            } else {
                process.exit(1); // error code
            }
        } else {
            winston.info("✅  Import image-scrapping done.");
            process.exit(0); // all good
        }
    });
};
//
constructor.prototype._postProcessRawObjects = function(dataSourceDescriptions, callback)
{
    var self = this;
    var i = 1;
    async.eachSeries(dataSourceDescriptions, function(dataSourceDescription, callback)
    {
        self._dataSourcePostProcessingFunction(i, dataSourceDescription, callback);
        i++;
    }, function(err)
    {
        callback(err);
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
            self._new_parsed_StringDocumentObject_fromCSVDataSourceDescription(indexInList, dataSourceDescription, dataSource_title, dataSourceRevision_pKey, function(err)
            {
                if (err) return callback(err);
                winston.info("✅  Saved document: ", dataSource_title);
                return callback(null);
            });
            break;
        }
        case import_datatypes.DataSource_formats.TSV:
        {
            self._new_parsed_StringDocumentObject_fromTSVDataSourceDescription(indexInList, dataSourceDescription, dataSource_title, dataSourceRevision_pKey, function(err)
            {
                if (err) return callback(err);
                winston.info("✅  Saved document: ", dataSource_title);
                return callback(null);
            });
            break;
        }
        default:
        {
            var errDescStr = "❌  Unrecognized data source format \"" + format + "\".";
            winston.error(errDescStr);
            callback(new Error(errDescStr)); // skip this one
        }
    };
};
//
constructor.prototype._new_parsed_StringDocumentObject_fromCSVDataSourceDescription = function(dataSourceIsIndexInList, csvDescription, sourceDocumentTitle, sourceDocumentRevisionKey, fn) 
{
    var self = this;
    //
    var CSV_resources_path_prefix = __dirname + "/resources";
    var filename = csvDescription.filename;
    var fileEncoding = csvDescription.fileEncoding || 'utf8';
    var revisionNumber = csvDescription.importRevision;
    var importUID = csvDescription.uid;
    winston.info("🔁  " + dataSourceIsIndexInList + ": Importing CSV \"" + filename + "\"");
    var filepath = CSV_resources_path_prefix + "/" + filename;
    //
    var raw_rowObjects_coercionScheme = csvDescription.raw_rowObjects_coercionScheme; // look up data type scheme here
    // so we can do translation/mapping just below
    // winston.info("raw_rowObjects_coercionScheme " , raw_rowObjects_coercionScheme)
    //
    // To solve a memory overflow issue to hold entire large CSV files, splitted them out by each line
    var lineNr = 0;
    var columnNames = [];
    var parsed_rowObjectsById = {};
    var parsed_orderedRowObjectPrimaryKeys = [];
    var cachedLines = '';
    var numberOfRows_inserted = 0;

    var parser = function(columnNamesAndThenRowObject)
    {
        // replace any dotted fields with underscores, e.g. comics.items to comics_items
        // column names
        if (lineNr == 1) {
            for (var i = 0; i < columnNamesAndThenRowObject.length; i++) {
                columnNamesAndThenRowObject[i] = columnNamesAndThenRowObject[i].replace(/\./g,"_");
            }
            columnNames = columnNamesAndThenRowObject;
        } else {
            // row objects
            //
            if (columnNamesAndThenRowObject.length != columnNames.length) {
                winston.error("❌  Error: Row has different number of values than number of CSV's number of columns. Skipping: ", rowObjectValues);

                return;
            }
            var rowObject = {};
            for (var columnIndex = 0 ; columnIndex < columnNames.length ; columnIndex++) {
                var columnName = "" + columnNames[columnIndex];
                var rowValue = columnNamesAndThenRowObject[columnIndex];
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
            var rowObject_primaryKey = csvDescription.fn_new_rowPrimaryKeyFromRowObject(rowObject, (lineNr-1));
            if (typeof rowObject_primaryKey === 'undefined' || rowObject_primaryKey == null || rowObject_primaryKey == "") {
                winston.error("❌  Error: missing pkey on row", rowObject, "with factory accessor", csvDescription.fn_new_rowPrimaryKeyFromRowObject);

                return;
            }
            var parsedObject = self.context.raw_row_objects_controller.New_templateForPersistableObject(rowObject_primaryKey, sourceDocumentRevisionKey, lineNr-2, rowObject);
            // winston.info("parsedObject " , parsedObject)
            if (parsed_rowObjectsById[rowObject_primaryKey] != null) {
                winston.info("⚠️  Warning: An object with the same primary key, \""
                    + rowObject_primaryKey
                    + "\" was already found in the parsed row objects cache on import."
                    + " Use the primary key function to further disambiguate primary keys. Skipping importing this row, .");

                return;
            }
            parsed_rowObjectsById[rowObject_primaryKey] = parsedObject;
            parsed_orderedRowObjectPrimaryKeys.push(rowObject_primaryKey);
        }
    };
    // Now read
    var readStream = fs.createReadStream(filepath, { encoding: fileEncoding })
        .pipe(es.split())
        .pipe(es.mapSync(function(line) {
                // pause the readstream
                readStream.pause();

                lineNr += 1;

                parse(cachedLines + line, {delimiter: ',', relax: true, skip_empty_lines: true}, function(err, output) {
                    if (err || !output || output.length == 0) {
                        //winston.info("❌  Error encountered during saving the line " + lineNr + " of document: ", sourceDocumentTitle);
                        cachedLines = cachedLines + line;
                        return readStream.resume();
                    }

                    cachedLines = '';

                    parser(output[0]);

                    // process line here and call s.resume() when rdy
                    if (lineNr % 1000 == 0) {
                        winston.info("🔁  Parsing " + lineNr + " rows in \"" + filename + "\"");

                        // Bulk for performance at volume
                        self.context.raw_row_objects_controller.InsertManyPersistableObjectTemplates
                        (parsed_orderedRowObjectPrimaryKeys, parsed_rowObjectsById, sourceDocumentRevisionKey, sourceDocumentTitle, function(err, record)
                        {
                            if (err) {
                                winston.error("❌  Error: An error while saving raw row objects: ", err);
                                return fn(err);
                            }
                            winston.info("✅  Saved " + lineNr + " lines of document: ", sourceDocumentTitle);

                            numberOfRows_inserted += parsed_orderedRowObjectPrimaryKeys.length;
                            parsed_rowObjectsById = {};
                            parsed_orderedRowObjectPrimaryKeys = [];

                            readStream.resume();
                        });
                    } else {
                        // resume the readstream, possibly from a callback
                        readStream.resume();
                    }
                });
            })
            .on('error', function(err)
            {
                winston.error("❌  Error encountered while trying to open CSV file. The file might not yet exist or the specified filename might contain a typo.");
                return fn(err);
            })
            .on('end', function(){
                // If we have any lines remaining, need to store document to the db.
                if (lineNr % 1000 == 0) {

                    winston.info("✅  Saved " + lineNr + " lines of document: ", sourceDocumentTitle);
                    var stringDocumentObject = self.context.raw_source_documents_controller.New_templateForPersistableObject(sourceDocumentRevisionKey, sourceDocumentTitle, revisionNumber, importUID, parsed_rowObjectsById, parsed_orderedRowObjectPrimaryKeys, numberOfRows_inserted);
                    stringDocumentObject.filename = filename;

                    self.context.raw_source_documents_controller.UpsertWithOnePersistableObjectTemplate(stringDocumentObject, fn);

                } else {

                    self.context.raw_row_objects_controller.InsertManyPersistableObjectTemplates
                    (parsed_orderedRowObjectPrimaryKeys, parsed_rowObjectsById, sourceDocumentRevisionKey, sourceDocumentTitle, function(err)
                    {
                        if (err) {
                            winston.error("❌  Error: An error while saving raw row objects: ", err);
                            return fn(err);
                        };
                        winston.info("✅  Saved " + lineNr + " lines of document: ", sourceDocumentTitle);

                        numberOfRows_inserted += parsed_orderedRowObjectPrimaryKeys.length;

                        var stringDocumentObject = self.context.raw_source_documents_controller.New_templateForPersistableObject(sourceDocumentRevisionKey, sourceDocumentTitle, revisionNumber, importUID, parsed_rowObjectsById, parsed_orderedRowObjectPrimaryKeys, numberOfRows_inserted);
                        stringDocumentObject.filename = filename;

                        self.context.raw_source_documents_controller.UpsertWithOnePersistableObjectTemplate(stringDocumentObject, fn);
                    });
                }
            })
        );
};
//
constructor.prototype._new_parsed_StringDocumentObject_fromTSVDataSourceDescription = function(dataSourceIsIndexInList, tsvDescription, sourceDocumentTitle, sourceDocumentRevisionKey, fn)
{
    var self = this;
    //
    var TSV_resources_path_prefix = __dirname + "/resources";
    var filename = tsvDescription.filename;
    var fileEncoding = tsvDescription.fileEncoding || 'utf8';
    var revisionNumber = tsvDescription.importRevision;
    var importUID = tsvDescription.uid;
    winston.info("🔁  " + dataSourceIsIndexInList + ": Importing TSV \"" + filename + "\"");
    var filepath = TSV_resources_path_prefix + "/" + filename;
    //
    var raw_rowObjects_coercionScheme = tsvDescription.raw_rowObjects_coercionScheme; // look up data type scheme here
    // so we can do translation/mapping just below
    // winston.info("raw_rowObjects_coercionScheme " , raw_rowObjects_coercionScheme)
    //
    // To solve a memory overflow issue to hold entire large TSV files, splitted them out by each line
    var lineNr = 0;
    var columnNames = [];
    var parsed_rowObjectsById = {};
    var parsed_orderedRowObjectPrimaryKeys = [];
    var cachedLines = '';
    var numberOfRows_inserted = 0;

    var parser = function(columnNamesAndThenRowObject)
    {
        // replace any dotted fields with underscores, e.g. comics.items to comics_items
        // column names
        if (lineNr == 1) {
            for (var i = 0; i < columnNamesAndThenRowObject.length; i++) {
                columnNamesAndThenRowObject[i] = columnNamesAndThenRowObject[i].replace(/\./g,"_");
            }
            columnNames = columnNamesAndThenRowObject;
        } else {
            // row objects
            //
            if (columnNamesAndThenRowObject.length != columnNames.length) {
                winston.error("❌  Error: Row has different number of values than number of TSV's number of columns. Skipping: ", rowObjectValues);

                return;
            }
            var rowObject = {};
            for (var columnIndex = 0 ; columnIndex < columnNames.length ; columnIndex++) {
                var columnName = "" + columnNames[columnIndex];
                var rowValue = columnNamesAndThenRowObject[columnIndex];
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
            var rowObject_primaryKey = tsvDescription.fn_new_rowPrimaryKeyFromRowObject(rowObject, (lineNr-1));
            if (typeof rowObject_primaryKey === 'undefined' || rowObject_primaryKey == null || rowObject_primaryKey == "") {
                winston.error("❌  Error: missing pkey on row", rowObject, "with factory accessor", tsvDescription.fn_new_rowPrimaryKeyFromRowObject);

                return;
            }
            var parsedObject = self.context.raw_row_objects_controller.New_templateForPersistableObject(rowObject_primaryKey, sourceDocumentRevisionKey, lineNr-2, rowObject);
            // winston.info("parsedObject " , parsedObject)
            if (parsed_rowObjectsById[rowObject_primaryKey] != null) {
                winston.info("⚠️  Warning: An object with the same primary key, \""
                    + rowObject_primaryKey
                    + "\" was already found in the parsed row objects cache on import."
                    + " Use the primary key function to further disambiguate primary keys. Skipping importing this row, .");

                return;
            }
            parsed_rowObjectsById[rowObject_primaryKey] = parsedObject;
            parsed_orderedRowObjectPrimaryKeys.push(rowObject_primaryKey);
        }
    };
    // Now read
    var readStream = fs.createReadStream(filepath, { encoding: fileEncoding })
        .pipe(es.split())
        .pipe(es.mapSync(function(line) {
                // pause the readstream
                readStream.pause();

                lineNr += 1;

                parse(cachedLines + line, {delimiter: '\t', relax: true, skip_empty_lines: true}, function(err, output) {
                    if (err || !output || output.length == 0) {
                        //winston.info("❌  Error encountered during saving the line " + lineNr + " of document: ", sourceDocumentTitle);
                        cachedLines = cachedLines + line;
                        return readStream.resume();
                    }

                    cachedLines = '';

                    parser(output[0]);

                    // process line here and call s.resume() when rdy
                    if (lineNr % 1000 == 0) {
                        winston.info("🔁  Parsing " + lineNr + " rows in \"" + filename + "\"");

                        // Bulk for performance at volume
                        self.context.raw_row_objects_controller.InsertManyPersistableObjectTemplates
                        (parsed_orderedRowObjectPrimaryKeys, parsed_rowObjectsById, sourceDocumentRevisionKey, sourceDocumentTitle, function(err, record)
                        {
                            if (err) {
                                winston.error("❌  Error: An error while saving raw row objects: ", err);
                                return fn(err);
                            }
                            winston.info("✅  Saved " + lineNr + " lines of document: ", sourceDocumentTitle);

                            numberOfRows_inserted += parsed_orderedRowObjectPrimaryKeys.length;
                            parsed_rowObjectsById = {};
                            parsed_orderedRowObjectPrimaryKeys = [];

                            readStream.resume();
                        });
                    } else {
                        // resume the readstream, possibly from a callback
                        readStream.resume();
                    }
                });
            })
            .on('error', function(err)
            {
                winston.error("❌  Error encountered while trying to open TSV file. The file might not yet exist or the specified filename might contain a typo.");
                return fn(err);
            })
            .on('end', function(){
                // If we have any lines remaining, need to store document to the db.
                if (lineNr % 1000 == 0) {

                    winston.info("✅  Saved " + lineNr + " lines of document: ", sourceDocumentTitle);
                    var stringDocumentObject = self.context.raw_source_documents_controller.New_templateForPersistableObject(sourceDocumentRevisionKey, sourceDocumentTitle, revisionNumber, importUID, parsed_rowObjectsById, parsed_orderedRowObjectPrimaryKeys, numberOfRows_inserted);
                    stringDocumentObject.filename = filename;

                    self.context.raw_source_documents_controller.UpsertWithOnePersistableObjectTemplate(stringDocumentObject, fn);

                } else {

                    self.context.raw_row_objects_controller.InsertManyPersistableObjectTemplates
                    (parsed_orderedRowObjectPrimaryKeys, parsed_rowObjectsById, sourceDocumentRevisionKey, sourceDocumentTitle, function(err, record)
                    {
                        if (err) {
                            winston.error("❌  Error: An error while saving raw row objects: ", err);
                            return fn(err);
                        };
                        winston.info("✅  Saved " + lineNr + " lines of document: ", sourceDocumentTitle);

                        numberOfRows_inserted += parsed_orderedRowObjectPrimaryKeys.length;

                        var stringDocumentObject = self.context.raw_source_documents_controller.New_templateForPersistableObject(sourceDocumentRevisionKey, sourceDocumentTitle, revisionNumber, importUID, parsed_rowObjectsById, parsed_orderedRowObjectPrimaryKeys, numberOfRows_inserted);
                        stringDocumentObject.filename = filename;

                        self.context.raw_source_documents_controller.UpsertWithOnePersistableObjectTemplate(stringDocumentObject, fn);
                    });
                }
            })
        );
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
    //
    // Firstly, generate the whole processed objects dataset
    //
    //self.context.processed_row_objects_controller.GenerateProcessedDatasetFromRawRowObjects
    self.context.processed_row_objects_controller.InsertProcessedDatasetFromRawRowObjects
        (dataSource_uid,
        dataSource_importRevision,
        dataSource_title,
        function(err)
    {
        if (err) {
            winston.error("❌  Error encountered while generating whole processed dataset \"" + dataSource_title + "\".");
            callback(err);
            return;
        }
        //
        //
        // Now generate fields by joins, etc.
        //
        async.eachSeries(dataSourceDescription.afterImportingAllSources_generate, function(description, cb)
        {
            var by = description.by;
            var formingRelationship = typeof description.relationship !== 'undefined' && description.relationship == true ? true : false;
            switch (by.doing) {
                case import_processing.Ops.Join:
                {
                    /* var matchFn = by.matchFn;
                    if (typeof matchFn === 'undefined' || matchFn == null) {
                        matchFn = import_processing.MatchFns.LocalEqualsForeignString;
                    }
                     self.context.processed_row_objects_controller.GenerateFieldsByJoining_comparingWithMatchFn(
                     dataSource_uid,
                     dataSource_importRevision,
                     dataSource_title,
                     description.field,
                     description.singular,
                     by.findingMatchOnFields,
                     by.ofOtherRawSrcUID,
                     by.andOtherRawSrcImportRevision,
                     by.withLocalField,
                     by.obtainingValueFromField,
                     formingRelationship,
                     matchFn,
                     cb
                     ); */
                    var matchRegex = by.matchRegex;
                    if (typeof matchRegex === 'undefined' || matchRegex == null || matchRegex == import_processing.MatchFns.LocalEqualsForeignString)
                        self.context.processed_row_objects_controller.GenerateFieldsByJoining(
                            dataSource_uid,
                            dataSource_importRevision,
                            dataSource_title,
                            description.field,
                            description.singular,
                            by.findingMatchOnFields,
                            by.ofOtherRawSrcUID,
                            by.andOtherRawSrcImportRevision,
                            by.withLocalField,
                            by.obtainingValueFromField,
                            formingRelationship,
                            cb
                        );
                    else
                        self.context.processed_row_objects_controller.GenerateFieldsByJoining_comparingWithMatchFn(
                            dataSource_uid,
                            dataSource_importRevision,
                            dataSource_title,
                            description.field,
                            description.singular,
                            by.findingMatchOnFields,
                            by.ofOtherRawSrcUID,
                            by.andOtherRawSrcImportRevision,
                            by.withLocalField,
                            by.obtainingValueFromField,
                            formingRelationship,
                            matchRegex,
                            cb
                        );
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
                callback(err);

                return;
            }
            callback();
        });
    });
};
//
//
constructor.prototype._proceedToScrapeImagesAndRemainderOfPostProcessing = function(indexInList, dataSourceDescription, callback)
{
    var self = this;
    async.eachSeries(dataSourceDescription.afterImportingAllSources_generateByScraping, function(description, cb)
    {
        self.context.processed_row_objects_controller.GenerateImageURLFieldsByScraping(dataSourceDescription.uid,
            dataSourceDescription.importRevision,
            dataSourceDescription.title,
            description.htmlSourceAtURLInField,
            description.imageSrcSetInSelector,
            description.prependToImageURLs || "",
            description.useAndHostSrcSetSizeByField,
            cb);
    }, function(err)
    {
        if (err) {
            winston.error("❌  Error encountered while scraping image with \"" + dataSourceDescription.title + "\".");
            callback(err);

            return;
        }
        //
        //
        // Now execute user-defined generalized post-processing pipeline
        //
        self._afterGeneratingProcessedDataSet_performEachRowOperations(indexInList, dataSourceDescription, callback);
    });
}
//
//
constructor.prototype._afterGeneratingProcessedDataSet_performEachRowOperations = function(indexInList, dataSourceDescription, callback)
{
    var self = this;
    //
    var dataSource_uid = dataSourceDescription.uid;
    var dataSource_importRevision = dataSourceDescription.importRevision;    
    var dataSource_title = dataSourceDescription.title;
    //
    var eachRowFns_length = dataSourceDescription.afterGeneratingProcessedRowObjects_eachRowFns ? dataSourceDescription.afterGeneratingProcessedRowObjects_eachRowFns.length : 0;
    //
    winston.info("🔁  Performing " + eachRowFns_length + " each-row operations for \"" + dataSource_title + "\"");
    //    
    var eachCtx = {};
    if (dataSourceDescription.afterGeneratingProcessedRowObjects_setupBefore_eachRowFn) {
        dataSourceDescription.afterGeneratingProcessedRowObjects_setupBefore_eachRowFn(self.context, eachCtx, function(err)
        {
            if (err) {
                winston.error("❌  Error encountered while performing each-row operations \"" + dataSource_title + "\".");
                callback(err);
                
                return;
            }
            continueToIterations();
        });
    } else {
        continueToIterations();
    }
    function continueToIterations() 
    {
        if (eachRowFns_length == 0) {
            continueToAfterIterating();
        } else {
            self.context.processed_row_objects_controller.EnumerateProcessedDataset(dataSource_uid, 
                                                                                    dataSource_importRevision,
            function(doc, eachCb)
            {
                async.eachSeries(dataSourceDescription.afterGeneratingProcessedRowObjects_eachRowFns, function(eachRowFn, cb)
                {
                    eachRowFn(self.context, eachCtx, doc, function(err)
                    {
                        cb(err);
                    });
                }, function(err)
                {
                    eachCb(err); // if err != null, the callback will be called just below in the errFn passed to EnumerateProcessedDataset
                })
            },
            function(err)
            {
                winston.error("❌  Error encountered while performing each-row operations \"" + dataSource_title + "\".");
                callback(err); // bail early
            },
            function()
            {
                continueToAfterIterating(); // done iterating each row
            }, 
            {});
        }
    }
    function continueToAfterIterating()
    {
        if (dataSourceDescription.afterGeneratingProcessedRowObjects_afterIterating_eachRowFn) {
            dataSourceDescription.afterGeneratingProcessedRowObjects_afterIterating_eachRowFn(self.context, eachCtx, function(err)
            {
                if (err) {
                    winston.error("❌  Error encountered while performing each-row operations \"" + dataSource_title + "\".");
                } else {
                    winston.info("✅  " + indexInList + ": Done processing \"" + dataSource_title + "\".");
                }
                //
                callback(err);
            });
        } else {
            winston.info("✅  " + indexInList + ": Done processing \"" + dataSource_title + "\".");
            callback(); // all done
        }
    }
}

