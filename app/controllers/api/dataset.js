var winston = require('winston');
var datasource_description = require('../../models/descriptions');
var raw_source_documents = require('../../models/raw_source_documents');
var mongoose_client = require('../../models/mongoose_client');
var _ = require('lodash');
var Batch = require('batch');
var aws = require('aws-sdk');
var fs = require('fs');
var es = require('event-stream');
var parse = require('csv-parse');
var datasource_file_service = require('../../libs/utils/aws-datasource-files-hosting');
var imported_data_preparation = require('../../libs/datasources/imported_data_preparation')
var datatypes = require('../../libs/datasources/datatypes');

module.exports.getAll = function (req, res) {
    datasource_description.find({schema_id: {$exists: false}}, {
        _id: 1,
        title: 1,
        importRevision: 1
    }, function (err, datasets) {
        if (err) {
            winston.error("❌  Error getting all datasets: " + err.message);

            return res.json({
                error: err.message
            })
        }
        return res.json({datasets: datasets});
    });
};

module.exports.remove = function (req, res) {
    if (!req.body.id)
        return res.json({error: 'No ID given'});

    var batch = new Batch();
    batch.concurrency(1);

    var description;
    var srcDocPKey;
    batch.push(function (done) {
        datasource_description.findById(req.body.id, function (err, data) {
            if (err) return done(err);

            if (!data) return done(new Error('No datasource exists : ' + req.body.id));

            description = data;
            srcDocPKey = raw_source_documents.NewCustomPrimaryKeyStringWithComponents(description.uid, description.importRevision);
            done();
        });
    });

    // Remove source document
    batch.push(function (done) {

        raw_source_documents.Model.findOne({primaryKey: srcDocPKey}, function (err, document) {
            if (err) return done(err);
            if (!document) return done();

            winston.info("✅  Removed raw source document : " + srcDocPKey + ", error: " + err);
            document.remove(done);
        });
    });

    // Remove processed row object
    batch.push(function (done) {

        mongoose_client.dropCollection('processedrowobjects-' + srcDocPKey, function (err) {
            // Consider that the collection might not exist since it's in the importing process.
            if (err && err.code != 26) return done(err);

            winston.info("✅  Removed processed row object : " + srcDocPKey + ", error: " + err);
            done();
        });

    });

    // Remove raw row object
    batch.push(function (done) {

        mongoose_client.dropCollection('rawrowobjects-' + srcDocPKey, function (err) {
            // Consider that the collection might not exist since it's in the importing process.
            if (err && err.code != 26) return done(err);

            winston.info("✅  Removed raw row object : " + srcDocPKey + ", error: " + err);
            done();
        })

    });

    // Remove datasource description
    batch.push(function (done) {
        description.remove(done);
    });

    // Remove datasource description with schema_id
    batch.push(function (done) {
        winston.info("✅  Removed datasource description : " + description.title);

        datasource_description.find({schema_id: description._id}, function (err, results) {
            if (err) return done(err);

            var batch = new Batch();
            batch.concurrency(1);

            results.forEach(function (element) {
                batch.push(function (done) {
                    element.remove(done);
                });
            });

            batch.end(function (err) {
                winston.info("✅  Removed all the schema descriptions inherited to the datasource description : " + description._id);
                done(err);
            });

        });
    });

    batch.end(function (err) {
        if (err) {
            winston.error("❌  Error encountered during raw objects remove : ", err);
            return res.json({error: err.message});
        }
        winston.info("✅  Removed dataset : " + description.title);
        res.json({success: 'ok'});
    });
}

module.exports.get = function (req, res) {
    if (!req.params.id)
        return res.json({error: 'No ID given'});

    datasource_description.findById(req.params.id)
        .lean()
        .deepPopulate('_otherSources schema_id _team _otherSources._team')
        .exec(function (err, description) {

            if (err) return res.json({error: err.message});
            if (!description) return res.json({error: 'Invalid ID'});

            if (description.schema_id) {
                description = datasource_description.Consolidate_descriptions_hasSchema(description);
            }

            if (!req.session.datasource) req.session.datasource = {};

            if (description.uid && !req.session.datasource[req.params.id]) {
                _readDatasourceColumnsAndSampleRecords(description, datasource_file_service.getDatasource(description).createReadStream(), function(err, datasource) {
                    if (err) return res.json({error: err.message});

                    req.session.datasource[req.params.id] = datasource;
                    description.colNames = datasource.colNames;
                    description.firstRecord = datasource.firstRecord;
                    return res.json({dataset: description});
                })
            } else {
                description.colNames = req.session.datasource[req.params.id].colNames;
                description.firstRecord = req.session.datasource[req.params.id].firstRecord;
                return res.json({dataset: description});
            }
        });
};

module.exports.getSourcesWithSchemaID = function(req, res) {
    if (!req.params.id)
        return res.json({error: 'No SchemaID given'});

    datasource_description.find({schema_id: req.params.id})
        .lean()
        .deepPopulate('_otherSources schema_id _team _otherSources._team')
        .exec(function (err, sources) {
            if (err) return res.json({error: "Error getting the sources with schema id : " + req.params.id});

            return res.json({
                sources: sources.map(function (source) {
                    return datasource_description.Consolidate_descriptions_hasSchema(source);
                })
            });
        });
}

module.exports.update = function (req, res) {
    if (!req.body._id) {

        // Creating of New Dataset
        datasource_description.create(req.body, function (err, doc) {
            if (err) return res.json({error: err.message});
            return res.json({id: doc.id});
        });

    } else {

        // Update of Existing Dataset
        datasource_description.findById(req.body._id, function (err, doc) {
            if (err) return res.json({error: err.message});
            if (!doc) return res.json({error: 'Invalid Operation'});

            _.forOwn(req.body, function (value, key) {
                if (key != '_id' && !_.isEqual(value, doc._doc[key])) {
                    winston.info('✅ Updated ' + doc.title + ' with - ' + key + ' with ' + value);

                    doc[key] = value;
                    if (typeof value === 'object')
                        doc.markModified(key);

                    // TODO: detect whether you need to re-import dataset to the system or not, and inform that the client
                    var keysForNeedToImport = [
                        'importRevision',
                        'fn_new_rowPrimaryKeyFromRowObject',
                        'raw_rowObjects_coercionScheme',
                        'relationshipFields',
                        'customFieldsToProcess',
                        'fe_nestedObject',
                        'imageScraping',
                        'fe_filters' // Only need to post-import cache
                    ];
                    doc.dirty = keysForNeedToImport.indexOf(key) != -1;
                }
            });

            doc.save(function (err, updatedDoc) {
                if (err) return res.json({error: err.message});
                if (!updatedDoc) return res.json({error: 'Invalid Operation'});

                return res.json({id: updatedDoc.id});
            });
        });

    }
};

function _readDatasourceColumnsAndSampleRecords(description, fileReadStream, next) {
    var delimiter;
    if (description.format == 'CSV') {
        delimiter = ',';
    } else if (description.format == 'TSV') {
        delimiter = '\t';
    } else {
        return next(new Error('Invalid File Format : ' + description.format));
    }

    var countOfLines = 0;
    var cachedLines = '';
    var datasource = {};

    var readStream = fileReadStream
        .pipe(es.split())
        .pipe(es.mapSync(function (line) {
                readStream.pause();

                parse(cachedLines + line, {delimiter: delimiter, relax: true, skip_empty_lines: true},
                    function (err, output) {
                        if (err) {
                            readStream.destroy();
                            return next(err);
                        }

                        if (!output || output.length == 0) {
                            cachedLines = cachedLines + line;
                            return readStream.resume();
                        }

                        if (!Array.isArray(output[0]) || output[0].length == 1) {
                            readStream.destroy();
                            return next(new Error('Invalid File'));
                        }

                        cachedLines = '';
                        countOfLines++;

                        if (countOfLines == 1) {
                            datasource.colNames = output[0];
                            readStream.resume();
                        } else if (countOfLines == 2) {
                            datasource.firstRecord = output[0];
                            readStream.resume();
                        } else {
                            readStream.destroy();
                            if (countOfLines == 3) next(null, datasource);
                        }
                    });
            })
        );
}

module.exports.upload = function (req, res) {
    if (!req.body.id)
        return res.json({error: 'No ID given'});

    var batch = new Batch;
    batch.concurrency(1);
    var description;

    batch.push(function (done) {
        datasource_description.findById(req.body.id)
            .exec(function (err, doc) {
                if (err) return done(err);

                description = doc;
                done();
            })
    });

    _.forEach(req.files, function (file) {
        batch.push(function (done) {

            if (file.mimetype == 'text/csv') {
                description.format = 'CSV';
            } else if (file.mimetype == 'text/tab-separated-values') {
                description.format = 'TSV';
            } else {
                return done(new Error('Invalid File Format : ' + file.mimetype));
            }

            // Verify that the file is readable & in the valid format.
            _readDatasourceColumnsAndSampleRecords(description, fs.createReadStream(file.path), function (err, datasource) {
                if (err) {
                    winston.error("❌  Error validating datasource : " + description.title + " : error " + err.message);
                    return done(err);
                }
                winston.info("✅  File validation okay : " + description.title);

                // Store columnNames and firstRecords for latter call on admin pages
                if (!req.session.datasource) req.session.datasource = {};
                req.session.datasource[description.id] = datasource;

                // Upload datasource to AWS S3
                if (!description.uid) description.uid = imported_data_preparation.DataSourceUIDFromTitle(description.title);
                var newFileName = datasource_file_service.fileNameToUpload(description);
                datasource_file_service.uploadDataSource(file.path, newFileName, file.mimetype, function (err) {
                    if (err) {
                        winston.error("❌  Error during uploading the dataset into AWS : " + description.title + " (" + err.message + ")");
                    }
                    done(err);
                });
            });
        });

        batch.push(function (done) {
            winston.info("✅  Uploaded datasource : " + description.title + ", " + description.uid);

            description.dirty = true;

            description.save(function (err, updatedDescription) {
                if (err) {
                    winston.error("❌  Error saving the dataset into the database : " + description.title + " (" + err.message + ")");
                    return done(err);
                }
                done();
            });
        });
    });

    batch.end(function (err) {
        if (err) {
            return res.json({error: err.message});
        }

        return res.json({id: description.id});
    });
}

module.exports.getAvailableTypeCoercions = function(req, res) {
    return res.json({availableTypeCoercions: datatypes.available_forFieldDataType_coercions()});
}

module.exports.download = function (req, res) {
    if (!req.params.id)
        return res.json({error: 'No ID given'});

    datasource_description.findById(req.params.id)
        .lean()
        .deepPopulate('_otherSources schema_id _team _otherSources._team')
        .exec(function (err, description) {

            if (err) return res.json({error: err.message});
            if (!description) return res.json({error: 'Invalid ID'});

            if (description.schema_id) {
                description = datasource_description.Consolidate_descriptions_hasSchema(description);
            }

            var fileName = datasource_file_service.fileNameToUpload(description);
            fileName += '.' + description.format.toLowerCase();
            res.attachment(fileName);

            datasource_file_service.getDatasource(description).createReadStream().pipe(res);

        });
}

module.exports.importData = function(req, res) {
    if (!req.body.id) {
        return res.json({error: 'No ID given'});
    }

    return res.json({error: 'Not completed'});
}