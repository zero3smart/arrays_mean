var fs = require('fs');
var parse = require('csv-parse');
var es = require('event-stream');
var async = require('async');
var winston = require('winston');

var import_datatypes = require('../../../datasources/utils/import_datatypes');
var raw_row_objects = require('../../../models/raw_row_objects');
var raw_source_documents = require('../../../models/raw_source_documents');

var datasourceUploadService = require('../../../.././lib/datasource_process/aws-datasource-files-hosting');
//
//
module.exports.ParseAndImportRaw = function (indexInList, dataSourceDescription, callback) {
    var dataSource_uid = dataSourceDescription.uid;
    var dataSource_importRevision = dataSourceDescription.importRevision;
    var dataSource_title = dataSourceDescription.title;
    var dataSourceRevision_pKey = raw_source_documents.NewCustomPrimaryKeyStringWithComponents(dataSource_uid, dataSource_importRevision);


    var format = dataSourceDescription.format;

    switch (format) {
        case "CSV":
        {
            _new_parsed_StringDocumentObject_fromCSVDataSourceDescription(indexInList, dataSourceDescription, dataSource_title, dataSourceRevision_pKey, function (err) {
                if (err) return callback(err);
                winston.info("✅  Saved document: ", dataSource_title);
                return callback(null);
            });
            break;
        }
        case "TSV" :
        {
            _new_parsed_StringDocumentObject_fromTSVDataSourceDescription(indexInList, dataSourceDescription, dataSource_title, dataSourceRevision_pKey, function (err) {
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
    }
    ;
};

var _new_parsed_StringDocumentObject_fromCSVDataSourceDescription = function (dataSourceIsIndexInList, csvDescription, sourceDocumentTitle, sourceDocumentRevisionKey, fn) {
    //
    // var CSV_resources_path_prefix = __dirname + "/../../../datasources/resources";

    var filename = csvDescription.filename;
    var fileEncoding = csvDescription.fileEncoding || 'utf8';
    var revisionNumber = csvDescription.importRevision;
    var importUID = csvDescription.uid;
    winston.info("🔁  " + dataSourceIsIndexInList + ": Importing CSV \"" + filename + "\"");
    // var filepath = CSV_resources_path_prefix + "/" + filename;

    var filepath = filename;


    //
    var raw_rowObjects_coercionScheme = csvDescription.raw_rowObjects_coercionScheme; // look up data type scheme here
    // var raw_rowObjects_mismatchScheme = csvDescription.raw_rowObjects_mismatchScheme;

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

    var parser = function (columnNamesAndThenRowObject) {
        // replace any dotted fields with underscores, e.g. comics.items to comics_items
        // column names
        if (lineNr == 1) {
            for (var i = 0; i < columnNamesAndThenRowObject.length; i++) {
                columnNamesAndThenRowObject[i] = columnNamesAndThenRowObject[i].replace(/\./g, "_");
            }
            columnNames = columnNamesAndThenRowObject;
        } else {
            // row objects
            //


            if (columnNamesAndThenRowObject.length != columnNames.length) {


                winston.error("❌  Error: Row has different number of values than number of CSV's number of columns.");

                return;
            }
            var rowObject = {};
            for (var columnIndex = 0; columnIndex < columnNames.length; columnIndex++) {
                var columnName = "" + columnNames[columnIndex];
                var rowValue = columnNamesAndThenRowObject[columnIndex];
                //
                var typeFinalized_rowValue = rowValue;

                // substitution / drop for mismatching fields in the common schema
                // if (raw_rowObjects_mismatchScheme != null && typeof raw_rowObjects_mismatchScheme !== 'undefined') {
                //     var mismatchSchemeForKey = raw_rowObjects_mismatchScheme[columnName];
                //     if (mismatchSchemeForKey != null && typeof mismatchSchemeForKey !== 'undefined') {
                //         // substitute
                //         if (mismatchSchemeForKey.do == import_datatypes.Mismatich_ops.ToField) {
                //             if (mismatchSchemeForKey.opts && typeof mismatchSchemeForKey.opts.field === 'string') {
                //                 columnName = mismatchSchemeForKey.opts.field;
                //             } else {
                //                 continue;
                //             }
                //         } else if (mismatchSchemeForKey.do == import_datatypes.Mismatich_ops.ToDrop) {
                //             continue;
                //         } else {
                //             continue;
                //         }
                //     }
                // }

                // now do type coercion/parsing here with functions to finalize


                if (raw_rowObjects_coercionScheme != null && typeof raw_rowObjects_coercionScheme !== 'undefined') {
                    var coercionSchemeForKey = raw_rowObjects_coercionScheme[columnName];
                    if (coercionSchemeForKey != null && typeof coercionSchemeForKey !== 'undefined') {
                        typeFinalized_rowValue = import_datatypes.NewDataTypeCoercedValue(coercionSchemeForKey, rowValue);
                    }
                }
                rowObject[columnName] = typeFinalized_rowValue; // Now store the finalized value

            }


            var rowObject_primaryKey = csvDescription.dataset_uid ? csvDescription.dataset_uid + "-" + (lineNr - 1) + "-" + rowObject[csvDescription.fn_new_rowPrimaryKeyFromRowObject] : "" + (lineNr - 1) + "-" + rowObject[csvDescription.fn_new_rowPrimaryKeyFromRowObject];


            if (typeof rowObject_primaryKey === 'undefined' || rowObject_primaryKey == null || rowObject_primaryKey == "") {
                winston.error("❌  Error: missing pkey on row", rowObject, "with factory accessor", csvDescription.fn_new_rowPrimaryKeyFromRowObject);

                return;
            }
            var parsedObject = raw_row_objects.New_templateForPersistableObject(rowObject_primaryKey, sourceDocumentRevisionKey, lineNr - 2, rowObject);
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

    // var readStream = fs.createReadStream(filepath, {encoding: fileEncoding})


    var readStream = datasourceUploadService.getDatasource(filepath).createReadStream()
        .pipe(es.split())
        .pipe(es.mapSync(function (line) {
                // pause the readstream
                readStream.pause();

                lineNr += 1;

                parse(cachedLines + line, {delimiter: ',', relax: true, skip_empty_lines: true}, function (err, output) {
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
                        raw_row_objects.InsertManyPersistableObjectTemplates
                        (parsed_orderedRowObjectPrimaryKeys, parsed_rowObjectsById, sourceDocumentRevisionKey, sourceDocumentTitle, function (err, record) {
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
            .on('error', function (err) {
                winston.error("❌  Error encountered while trying to open CSV file. The file might not yet exist or the specified filename might contain a typo.");
                return fn(err);
            })
            .on('end', function () {
                // If we have any lines remaining, need to store document to the db.
                if (lineNr % 1000 == 0) {

                    winston.info("✅  Saved " + lineNr + " lines of document: ", sourceDocumentTitle);
                    var stringDocumentObject = raw_source_documents.New_templateForPersistableObject(sourceDocumentRevisionKey, sourceDocumentTitle, revisionNumber, importUID, parsed_rowObjectsById, parsed_orderedRowObjectPrimaryKeys, numberOfRows_inserted);
                    stringDocumentObject.filename = filename;

                    raw_source_documents.UpsertWithOnePersistableObjectTemplate(stringDocumentObject, fn);

                } else {

                    raw_row_objects.InsertManyPersistableObjectTemplates
                    (parsed_orderedRowObjectPrimaryKeys, parsed_rowObjectsById, sourceDocumentRevisionKey, sourceDocumentTitle, function (err) {
                        if (err) {
                            winston.error("❌  Error: An error while saving raw row objects: ", err);
                            return fn(err);
                        }
                        ;
                        winston.info("✅  Saved " + lineNr + " lines of document: ", sourceDocumentTitle);

                        numberOfRows_inserted += parsed_orderedRowObjectPrimaryKeys.length;

                        var stringDocumentObject = raw_source_documents.New_templateForPersistableObject(sourceDocumentRevisionKey, sourceDocumentTitle, revisionNumber, importUID, parsed_rowObjectsById, parsed_orderedRowObjectPrimaryKeys, numberOfRows_inserted);
                        stringDocumentObject.filename = filename;

                        raw_source_documents.UpsertWithOnePersistableObjectTemplate(stringDocumentObject, fn);
                    });
                }
            })
        );
};
//
var _new_parsed_StringDocumentObject_fromTSVDataSourceDescription = function (dataSourceIsIndexInList, tsvDescription, sourceDocumentTitle, sourceDocumentRevisionKey, fn) {
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

    var parser = function (columnNamesAndThenRowObject) {
        // replace any dotted fields with underscores, e.g. comics.items to comics_items
        // column names
        if (lineNr == 1) {
            for (var i = 0; i < columnNamesAndThenRowObject.length; i++) {
                columnNamesAndThenRowObject[i] = columnNamesAndThenRowObject[i].replace(/\./g, "_");
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
            for (var columnIndex = 0; columnIndex < columnNames.length; columnIndex++) {
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
            var rowObject_primaryKey = tsvDescription.fn_new_rowPrimaryKeyFromRowObject(rowObject, (lineNr - 1));
            if (typeof rowObject_primaryKey === 'undefined' || rowObject_primaryKey == null || rowObject_primaryKey == "") {
                winston.error("❌  Error: missing pkey on row", rowObject, "with factory accessor", tsvDescription.fn_new_rowPrimaryKeyFromRowObject);

                return;
            }
            var parsedObject = raw_row_objects.New_templateForPersistableObject(rowObject_primaryKey, sourceDocumentRevisionKey, lineNr - 2, rowObject);
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


    var readStream = fs.createReadStream(filepath, {encoding: fileEncoding})
        .pipe(es.split())
        .pipe(es.mapSync(function (line) {
                // pause the readstream
                readStream.pause();

                lineNr += 1;

                parse(cachedLines + line, {delimiter: '\t', relax: true, skip_empty_lines: true}, function (err, output) {
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
                        raw_row_objects.InsertManyPersistableObjectTemplates
                        (parsed_orderedRowObjectPrimaryKeys, parsed_rowObjectsById, sourceDocumentRevisionKey, sourceDocumentTitle, function (err, record) {
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
            .on('error', function (err) {
                winston.error("❌  Error encountered while trying to open TSV file. The file might not yet exist or the specified filename might contain a typo.");
                return fn(err);
            })
            .on('end', function () {
                // If we have any lines remaining, need to store document to the db.
                if (lineNr % 1000 == 0) {

                    winston.info("✅  Saved " + lineNr + " lines of document: ", sourceDocumentTitle);
                    var stringDocumentObject = raw_source_documents.New_templateForPersistableObject(sourceDocumentRevisionKey, sourceDocumentTitle, revisionNumber, importUID, parsed_rowObjectsById, parsed_orderedRowObjectPrimaryKeys, numberOfRows_inserted);
                    stringDocumentObject.filename = filename;

                    raw_source_documents.UpsertWithOnePersistableObjectTemplate(stringDocumentObject, fn);

                } else {

                    raw_row_objects.InsertManyPersistableObjectTemplates
                    (parsed_orderedRowObjectPrimaryKeys, parsed_rowObjectsById, sourceDocumentRevisionKey, sourceDocumentTitle, function (err, record) {
                        if (err) {
                            winston.error("❌  Error: An error while saving raw row objects: ", err);
                            return fn(err);
                        }
                        ;
                        winston.info("✅  Saved " + lineNr + " lines of document: ", sourceDocumentTitle);

                        numberOfRows_inserted += parsed_orderedRowObjectPrimaryKeys.length;

                        var stringDocumentObject = raw_source_documents.New_templateForPersistableObject(sourceDocumentRevisionKey, sourceDocumentTitle, revisionNumber, importUID, parsed_rowObjectsById, parsed_orderedRowObjectPrimaryKeys, numberOfRows_inserted);
                        stringDocumentObject.filename = filename;

                        raw_source_documents.UpsertWithOnePersistableObjectTemplate(stringDocumentObject, fn);
                    });
                }
            })
        );
};