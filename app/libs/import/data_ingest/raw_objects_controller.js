var fs = require('fs');
var parse = require('csv-parse');
var es = require('event-stream');
var async = require('async');
var winston = require('winston');

var datatypes = require('../../datasources/datatypes');
var raw_row_objects = require('../../../models/raw_row_objects');
var raw_source_documents = require('../../../models/raw_source_documents');

var datasource_file_service = require('../../utils/aws-datasource-files-hosting');
//
//
module.exports.ParseAndImportRaw = function (indexInList, dataSourceDescription,job, callback) {
    var dataSource_uid = dataSourceDescription.uid;
    var dataSource_importRevision = dataSourceDescription.importRevision;
    var dataSource_title = dataSourceDescription.title;
    var dataSourceRevision_pKey = raw_source_documents.NewCustomPrimaryKeyStringWithComponents(dataSource_uid, dataSource_importRevision);


    var format = dataSourceDescription.format;

    switch (format) {
        case "CSV":
        {
            _new_parsed_StringDocumentObject_fromDataSourceDescription(job,indexInList, dataSourceDescription, dataSource_title, dataSourceRevision_pKey, 'CSV', function (err) {
                if (err) return callback(err);
                winston.info("✅  Saved document: ", dataSource_title);
                return callback(null);
            });
            break;
        }
        case "TSV" :
        {
            _new_parsed_StringDocumentObject_fromDataSourceDescription(job,indexInList, dataSourceDescription, dataSource_title, dataSourceRevision_pKey, 'TSV', function (err) {
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

var _new_parsed_StringDocumentObject_fromDataSourceDescription = function (job,dataSourceIsIndexInList, description, sourceDocumentTitle, sourceDocumentRevisionKey, fileType, fn) {
    //

    var revisionNumber = description.importRevision;
    var importUID = description.uid;
    var title = description.title;
    var delimiter = ',';
    if (fileType == 'TSV') delimiter = '\t';
    var fileEncoding = description.fileEncoding || 'utf8';

    winston.info("🔁  " + dataSourceIsIndexInList + ": Importing " + fileType + " \"" + title + "\"");
    job.log("🔁  Importing " + fileType + " \"" + title + "\"");

    var filepath;

    var readFromlocal = false;
    
    //To BE modified to match the new version
    // if (process.env.READ_FILE_FROM && process.env.READ_FILE_FROM == 'local') {
    //      var path_prefix = __dirname + "/../../user/"  + description._team.subdomain + '/data';
    //      filepath = CSV_resources_path_prefix + "/" + importUID;
    //      readFromlocal = true;
    // }

    var raw_rowObjects_coercionScheme = description.raw_rowObjects_coercionScheme; // look up data type scheme here
    // var raw_rowObjects_mismatchScheme = description.raw_rowObjects_mismatchScheme;

    // so we can do translation/mapping just below
    // winston.info("raw_rowObjects_coercionScheme " , raw_rowObjects_coercionScheme)
    //
    // To solve a memory overflow issue to hold entire large files, splitted them out by each line
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


                winston.error("❌  Error: Row has different number of values than number of " + fileType + "'s number of columns.");
                job.log("❌  Error: Row has different number of values than number of " + fileType + "'s number of columns.");

                return;
            }
            var rowObject = {};
           


            for (var columnIndex = 0; columnIndex < columnNames.length; columnIndex++) {
                var columnName = "" + columnNames[columnIndex];

                columnName = columnName.replace(/\./g, "_");

                var rowValue = columnNamesAndThenRowObject[columnIndex];
                //
                var typeFinalized_rowValue = rowValue;

                // substitution / drop for mismatching fields in the common schema
                // if (raw_rowObjects_mismatchScheme != null && typeof raw_rowObjects_mismatchScheme !== 'undefined') {
                //     var mismatchSchemeForKey = raw_rowObjects_mismatchScheme[columnName];
                //     if (mismatchSchemeForKey != null && typeof mismatchSchemeForKey !== 'undefined') {
                //         // substitute
                //         if (mismatchSchemeForKey.do == datatypes.Mismatich_ops.ToField) {
                //             if (mismatchSchemeForKey.opts && typeof mismatchSchemeForKey.opts.field === 'string') {
                //                 columnName = mismatchSchemeForKey.opts.field;
                //             } else {
                //                 continue;
                //             }
                //         } else if (mismatchSchemeForKey.do == datatypes.Mismatich_ops.ToDrop) {
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

                        if (coercionSchemeForKey.operation) {
                            typeFinalized_rowValue = datatypes.NewDataTypeCoercedValue(coercionSchemeForKey, rowValue);

                        }

                    }
                }
                rowObject[columnName] = typeFinalized_rowValue; // Now store the finalized value

            }


            var rowObject_primaryKey = description.dataset_uid ? description.dataset_uid + "-" + (lineNr - 1) : "" + (lineNr - 1) ;


            var parsedObject = raw_row_objects.New_templateForPersistableObject(rowObject_primaryKey, sourceDocumentRevisionKey, rowObject);
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

    var readStream = datasource_file_service.getDatasource(description).createReadStream();

    readStream = readStream.pipe(es.split())
        .pipe(es.mapSync(function (line) {
                // pause the readstream
                readStream.pause();

                lineNr += 1;

                parse(cachedLines + line, {delimiter: delimiter, relax: true, skip_empty_lines: true}, function (err, output) {
                    if (err || !output || output.length == 0) {
                        //winston.info("❌  Error encountered during saving the line " + lineNr + " of document: ", sourceDocumentTitle);
                        cachedLines = cachedLines + line;
                        return readStream.resume();
                    }

                    cachedLines = '';


                    parser(output[0]);

                    // process line here and call s.resume() when rdy
                    if (lineNr % 1000 == 0) {
                        winston.info("🔁  Parsing " + lineNr + " rows in \"" + title + "\"");
                        job.log("🔁  Parsing " + lineNr + " rows in \"" + title + "\"");
                        // Bulk for performance at volume

                        raw_row_objects.InsertManyPersistableObjectTemplates
                        (parsed_orderedRowObjectPrimaryKeys, parsed_rowObjectsById, sourceDocumentRevisionKey, sourceDocumentTitle, function (err, record) {
                            if (err) {
                                winston.error("❌  Error: An error while saving raw row objects: ", err);
                                return fn(err);
                            }
                            winston.info("✅  Saved " + lineNr + " lines of document: ", sourceDocumentTitle);
                            job.log("✅  Saved " + lineNr + " lines of document: ", sourceDocumentTitle);

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
                winston.error("❌  Error encountered while trying to open file. The file might not yet exist.");
                return fn(err);
            })
            .on('end', function () {


                // If we have any lines remaining, need to store document to the db.
                if (lineNr % 1000 == 0) {

                    winston.info("✅  Saved " + lineNr + " lines of document: ", sourceDocumentTitle);
                    job.log("✅  Saved " + lineNr + " lines of document: ", sourceDocumentTitle);
                    var stringDocumentObject = raw_source_documents.New_templateForPersistableObject(sourceDocumentRevisionKey, sourceDocumentTitle, revisionNumber, importUID, parsed_rowObjectsById, parsed_orderedRowObjectPrimaryKeys, numberOfRows_inserted);
                    var append = description.dataset_uid? true: false;
                    raw_source_documents.UpsertWithOnePersistableObjectTemplate(append,stringDocumentObject, fn);

                } else {

                    raw_row_objects.InsertManyPersistableObjectTemplates
                    (parsed_orderedRowObjectPrimaryKeys, parsed_rowObjectsById, sourceDocumentRevisionKey, sourceDocumentTitle, function (err) {
                        if (err) {
                            winston.error("❌  Error: An error while saving raw row objects: ", err);
                            return fn(err);
                        }
                        ;
                        winston.info("✅  Saved " + lineNr + " lines of document: ", sourceDocumentTitle);
                        job.log("✅  Saved " + lineNr + " lines of document: ", sourceDocumentTitle);

                        numberOfRows_inserted += parsed_orderedRowObjectPrimaryKeys.length;

                        var stringDocumentObject = raw_source_documents.New_templateForPersistableObject(sourceDocumentRevisionKey, sourceDocumentTitle, revisionNumber, importUID, parsed_rowObjectsById, parsed_orderedRowObjectPrimaryKeys, numberOfRows_inserted);
                        var append = description.dataset_uid? true: false;
                        raw_source_documents.UpsertWithOnePersistableObjectTemplate(append,stringDocumentObject, fn);
                    });
                }
            })
        );
};