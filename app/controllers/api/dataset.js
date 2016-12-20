var winston = require('winston');
var datasource_description = require('../../models/descriptions');
var raw_source_documents = require('../../models/raw_source_documents');
var cached_values = require('../../models/cached_values');
var mongoose_client = require('../../models/mongoose_client');
var Team = require('../../models/teams');
var User = require('../../models/users');
var _ = require('lodash');
var Batch = require('batch');
var aws = require('aws-sdk');
var fs = require('fs');
var es = require('event-stream');
var parse = require('csv-parse');
var datasource_file_service = require('../../libs/utils/aws-datasource-files-hosting');
var imported_data_preparation = require('../../libs/datasources/imported_data_preparation')
var datatypes = require('../../libs/datasources/datatypes');
var import_controller = require('../../libs/import/data_ingest/controller');
var postimport_caching_controller = require('../../libs/import/cache/controller');
var s3ImageHosting = require('../../libs/utils/aws-image-hosting');
var processing = require('../../libs/datasources/processing');


function getAllDatasetsWithQuery(query, res) {
    datasource_description.find({$and: [{schema_id: {$exists: false}}, query]}, {
        _id: 1,
        uid: 1,
        title: 1,
        importRevision: 1
    }, function (err, datasets) {
        if (err) {
            return res.json({error: err.message});
        }
        return res.json({datasets: datasets});
    })

}

module.exports.getDatasetsWithQuery = function(req,res) {
    var query = req.body;
    getAllDatasetsWithQuery(query,res);
};

module.exports.signedUrlForAssetsUpload = function (req, res) {
    datasource_description.findById(req.params.id)
        .populate('_team')
        .exec(function (err, description) {
            var key = description._team.subdomain + '/datasets/' + description.uid + '/assets/banner/' + req.query.fileName;
            s3ImageHosting.signedUrlForPutObject(key, req.query.fileType, function (err, data) {
                if (err) {
                    return res.status(500).send(err);
                } else {
                    return res.json({putUrl: data.putSignedUrl, publicUrl: data.publicUrl});
                }
            })
        })

};

module.exports.remove = function (req, res) {
    if (!req.body.id)
        return res.json({error: 'No ID given'});

    var batch = new Batch();
    batch.concurrency(1);

    var description;
    var srcDocPKey;

    batch.push(function (done) {
        datasource_description.findById(req.body.id)
        .populate('_team')
        .exec(function(err,data){
            if (err) return done(err);

            if (!data) return done(new Error('No datasource exists : ' + req.body.id));

            description = data;
            srcDocPKey = raw_source_documents.NewCustomPrimaryKeyStringWithComponents(description.uid, description.importRevision);
            done();
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

    // Remove source document
    batch.push(function (done) {

        raw_source_documents.Model.findOne({primaryKey: srcDocPKey}, function (err, document) {
            if (err) return done(err);
            if (!document) return done();

            winston.info("✅  Removed raw source document : " + srcDocPKey + ", error: " + err);
            document.remove(done);
        });
    });

    //Remove cache filter
    batch.push(function(done) {
        cached_values.findOne({srcDocPKey: srcDocPKey},function(err,document) {
            if (err) return done(err);
            if (!document) return done();
             winston.info("✅  Removed cached unique values : " + srcDocPKey + ", error: " + err);
             document.remove(done);
        })
    });

    //Pull from team's datasourceDescriptions
    batch.push(function(done) {
        Team.update({_id:description._team},{$pull:{datasourceDescriptions:description._id}},done);
    })



    batch.push(function(done) {
        datasource_file_service.deleteDataset(description,done);
    })


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


    batch.push(function(done) {
        User.update({$or: [{_editors:req.body.id},{_viewers: req.body.id}]},{$pull: {_editors: req.body.id,_viewers:req.body.id}},done);
    });

    batch.end(function (err) {
        if (err) {
            winston.error("❌  Error encountered during raw objects remove : ", err);
            return res.json({error: err.message});
        }
        winston.info("✅  Removed dataset : " + description.title);
        res.json({success: 'ok'});
    });
};

module.exports.get = function (req, res) {

    if (!req.params.id)
        return res.json({error: 'No ID given'});

    datasource_description.findById(req.params.id)
        .lean()
        .deepPopulate('schema_id _team schema_id._team')
        .exec(function (err, description) {

            if (err) return res.json({error: err.message});
            if (!description) return res.json({error: 'Invalid ID'});

            if (description.schema_id) {
                description = datasource_description.Consolidate_descriptions_hasSchema(description);
            }

            if (!req.session.columns) req.session.columns = {};

            if (description.uid && !req.session.columns[req.params.id]) {

                _readDatasourceColumnsAndSampleRecords(description, datasource_file_service.getDatasource(description).createReadStream(), function (err, columns) {
                    if (err) return res.json({error: err.message});

                    req.session.columns[req.params.id] = columns;
                    description.columns = columns;
                    return res.json({dataset: description});
                });

            } else {

                if (req.session.columns[req.params.id]) description.columns = req.session.columns[req.params.id];

                return res.json({dataset: description});
            }
        });
};

module.exports.loadDatasourceColumnsForMapping = function (req, res) {
    if (!req.params.pKey) return res.json({error: 'No Primary Key given'});

    var split = req.params.pKey.split("-");
    var query = {uid: split[0], importRevision: parseInt(split[1].substring(1))};

    datasource_description.findOne(query)
        .populate('_team')
        .lean()
        .exec(function (err, description) {
            if (err) return res.json({error: err.message});

            if (!req.session.columns) req.session.columns = {};

            if (description.uid && !req.session.columns[description._id]) {
                _readDatasourceColumnsAndSampleRecords(description, datasource_file_service.getDatasource(description).createReadStream(), function (err, columns) {
                    if (err) return res.json({error: err.message});

                    req.session.columns[description._id] = columns;
                    res.json({
                        cols: columns.filter(function (e) {
                            return !description.fe_excludeFields || !description.fe_excludeFields[e.name];
                        })
                    });
                });
            } else {
                if (req.session.columns[description._id])
                    return res.json({
                        cols: req.session.columns[description._id].filter(function (e) {
                            return !description.fe_excludeFields || !description.fe_excludeFields[e.name];
                        })
                    });
                else
                    return res.json({error: 'No datasource uploaded!'});
            }
        });
};

module.exports.getAdditionalSourcesWithSchemaID = function (req, res) {
    if (!req.params.id) return res.json({error: 'No SchemaID given'});

    datasource_description.find({schema_id: req.params.id})
        .lean()
        .deepPopulate('schema_id _team schema_id._team')
        .exec(function (err, sources) {
            if (err) return res.json({error: "Error getting the addiontal datasources with schema id : " + req.params.id});

            return res.json({
                sources: sources.map(function (source) {
                    return datasource_description.Consolidate_descriptions_hasSchema(source);
                })
            });
        });
};

module.exports.publish = function (req, res) {
    datasource_description.findByIdAndUpdate(req.body.id, {$set: {isPublic: req.body.isPublic}}, function (err, savedDesc) {
        if (err) {
            res.status(500).send({error: err.message});
        } else {
            res.status(200).send('ok');
        }
    })
};

module.exports.update = function (req, res) {

    if (!req.body._id) {

        // Creating of New Dataset
        datasource_description.create(req.body, function (err, doc) {

            if (err) {
                return res.json({error: err.message});
            } else {

                Team.findById(req.body._team, function (err, team) {
                    if (err) {
                        return res.json({error: err.message});
                    } else {
                        team.datasourceDescriptions.push(doc.id);
                        team.save(function (err, saved) {
                            if (err) return res.json({error: err.message});
                            return res.json({id: doc.id});
                        });
                    }
                })

            }
        });

    } else {

        // Update of Existing Dataset
        datasource_description.findById(req.body._id)
            .populate('schema_id')
            .exec(function (err, doc) {

                if (err) return res.json({error: err.message});
                if (!doc) return res.json({error: 'Invalid Operation'});

                var description = doc, description_title = doc.title;
                if (doc.schema_id) {
                    description = datasource_description.Consolidate_descriptions_hasSchema(doc);
                    description_title = description.title + ' (' + doc.dataset_uid + ')';
                }
                winston.info("🔁  Updating the dataset " + description_title + "...");

                if (doc.relationshipFields && doc.relationshipFields.length > 0) doc.dirty = 3;
                if (doc.customFieldsToProcess && doc.customFieldsToProcess.length > 0) doc.dirty = 3;
                if (doc.fe_nestedObject && doc.fe_nestedObject.fields.length > 0) doc.dirty = 3;

                _.forOwn(req.body, function (value, key) {
                    if (key != '_id' && ((!doc.schema_id && !_.isEqual(value, doc._doc[key]))
                        || (doc.schema_id && !_.isEqual(value, description[key])))) {

                        winston.info('  ✅ ' + key + ' with ' + JSON.stringify(value));

                        if (key == 'dirty') return;

                        doc[key] = value;
                        if (typeof value === 'object')
                            doc.markModified(key);

                        // detect whether you need to re-import dataset to the system or not, and inform that the client

                        // Only post-import cache
                        var keysForNeedToImport = [
                            'fe_filters',
                            'fe_excludeFields'
                        ];
                        if (keysForNeedToImport.indexOf(key) != -1 && doc.dirty < 1)
                            doc.dirty = 1;

                        // Import without image scrapping
                        keysForNeedToImport = [
                            'importRevision',
                            'fn_new_rowPrimaryKeyFromRowObject',
                            'raw_rowObjects_coercionScheme',
                            'relationshipFields',
                            'customFieldsToProcess',
                            'fe_nestedObject'
                        ];
                        if (keysForNeedToImport.indexOf(key) != -1 && doc.dirty < 2)
                            doc.dirty = 2;

                        // Full Import
                        keysForNeedToImport = [
                            'imageScraping',
                        ];
                        if (keysForNeedToImport.indexOf(key) != -1 && doc.dirty < 3)
                            doc.dirty = 3;
                    }
                });

                doc.save(function (err, updatedDoc) {
                    if (err) return res.json({error: err.message});
                    if (!updatedDoc) return res.json({error: 'Invalid Operation'});

                    if (!doc.schema_id) {
                        return res.json({id: updatedDoc.id});
                    } else {
                        var findQuery = {_id: doc.id};
                        // Inherited fields from the schema should be undefined
                        // TODO: Is there anyway to update the selected fields only?
                        var updateQuery = { $unset: {
                            imageScraping: 1,
                            isPublic: 1,
                            customFieldsToProcess: 1,
                            _otherSources: 1,
                            fe_filters: 1,
                            fe_fieldDisplayOrder: 1,
                            urls: 1,
                            importRevision: 1
                        } };
                        datasource_description.findOneAndUpdate(findQuery, updateQuery, {upsert: true, new: true},
                            function(err, updatedDoc) {
                                if (err) return res.json({error: err.message});
                                if (!updatedDoc) return res.json({error: 'Invalid Operation'});

                                return res.json({id: updatedDoc.id});
                            });
                    }
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
    var columns = [];

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
                            columns = output[0].map(function (e) {
                                return {name: e.replace(/\./g, '_')};
                            });
                            readStream.resume();
                        } else if (countOfLines == 2) {
                            columns = columns.map(function (e, i) {
                                return {name: e.name, sample: output[0][i]};
                            });
                            readStream.resume();
                        } else {
                            readStream.destroy();
                            if (countOfLines == 3) next(null, columns);
                        }
                    });
            })
        );
}

module.exports.upload = function (req, res) {
    if (!req.body.id) return res.json({error: 'No ID given'});
    var child = req.body.child;

    var batch = new Batch;
    batch.concurrency(1);
    var description, schema_description, description_title;

    res.writeHead(200, {'Content-Type': 'application/json'});
    res.connection.setTimeout(0);

    batch.push(function (done) {
        datasource_description.findById(req.body.id)
            .populate('_team')
            .exec(function (err, doc) {
                if (err) return done(err);

                description = doc;
                description_title = description.title;
                done();
            })
    });

    if (child) {
        batch.push(function (done) {
            schema_description = description;

            var findQuery = {dataset_uid: req.body.dataset_uid, schema_id: req.body.id};
            // Inherited fields from the schema should be undefined
            // TODO: Is there anyway to update the selected fields only?
            var insertQuery = {
                dataset_uid: req.body.dataset_uid,
                schema_id: req.body.id,
                fe_listed: false,
                fe_visible: false,
                $unset: {
                    fe_nestedObject: 1,
                    imageScraping: 1,
                    isPublic: 1,
                    customFieldsToProcess: 1,
                    _otherSources: 1,
                    fe_filters: 1,
                    fe_fieldDisplayOrder: 1,
                    urls: 1,
                    importRevision: 1
                }
            };
            datasource_description.findOneAndUpdate(findQuery, insertQuery, {upsert: true, new: true}, function(err, doc) {
                if (err) return done(err);
                doc.schema_id = schema_description;
                description = datasource_description.Consolidate_descriptions_hasSchema(doc);

                description_title = description.title + "(" + description.dataset_uid + ")";
                done();
            });
        });
    }

    _.forEach(req.files, function (file) {
        batch.push(function (done) {

            if (file.mimetype == 'text/csv' || file.mimetype == 'application/octet-stream'
                || file.mimetype == 'text/tab-separated-values' || file.mimetype == 'application/vnd.ms-excel') {
                var exts = file.originalname.split('.');
                var ext = exts[exts.length - 1].toLowerCase();
                if (ext == 'csv') {
                    description.format = 'CSV';
                } else if (ext == 'tsv') {
                    description.format = 'TSV';
                } else {
                    return done(new Error('Invalid File Format : ' + file.mimetype + ', ' + ext));
                }
            } else {
                return done(new Error('Invalid File Format : ' + file.mimetype + ', ' + ext));
            }

            // Verify that the file is readable & in the valid format.
            _readDatasourceColumnsAndSampleRecords(description, fs.createReadStream(file.path), function (err, columns) {
                if (err) {
                    winston.error("❌  Error validating datasource : " + description_title + " : error " + err.message);
                    return done(err);
                }
                winston.info("✅  File validation okay : " + description_title);

                // Store columnNames and firstRecords for latter call on dashboard pages
                if (!req.session.columns) req.session.columns = {};
                // TODO: Do we need to save the columns for the additional datasource,
                // since it should be same as the master datasource???
                req.session.columns[description.id] = columns;

                // Upload datasource to AWS S3
                if (!description.uid) description.uid = imported_data_preparation.DataSourceUIDFromTitle(description.title);
                var newFileName = datasource_file_service.fileNameToUpload(description);
                datasource_file_service.uploadDataSource(file.path, newFileName, file.mimetype, description._team.subdomain, description.uid, function (err) {
                    if (err) {
                        winston.error("❌  Error during uploading the dataset into AWS : " + description_title + " (" + err.message + ")");
                    }
                    done(err);
                });
            });
        });

        batch.push(function (done) {
            winston.info("✅  Uploaded datasource : " + description_title);

            if (!child) {
                description.dirty = 3; // Full Import with image scraping

                description.save(function (err, updatedDescription) {
                    if (err)
                        winston.error("❌  Error saving the dataset into the database : " + description_title + " (" + err.message + ")");
                    done(err);
                });
            } else {
                var findQuery = {_id: description.id};
                // TODO: Need to update the selected fields only!
                var updateQuery = {
                    format: description.format,
                    dirty: 3,
                    imported: false,
                    $unset: {
                        fe_nestedObject: 1,
                        imageScraping: 1,
                        isPublic: 1,
                        customFieldsToProcess: 1,
                        _otherSources: 1,
                        fe_filters: 1,
                        fe_fieldDisplayOrder: 1,
                        urls: 1,
                        importRevision: 1
                    }
                };
                datasource_description.findOneAndUpdate(findQuery, updateQuery, function(err, doc) {
                    if (err)
                        winston.error("❌  Error saving the dataset into the database : " + description_title + " (" + err.message + ")");
                    done(err);
                });
            }
        });
    });

    batch.end(function (err) {
        if (err) {
            return res.end(JSON.stringify({error: err.message}));
        }

        return res.end(JSON.stringify({id: description.id,uid:description.uid}));
    });
};

module.exports.getAvailableTypeCoercions = function (req, res) {
    return res.json({availableTypeCoercions: datatypes.available_forFieldDataType_coercions()});
};

module.exports.getAvailableDesignatedFields = function (req, res) {
    return res.json({
        availableDesignatedFields: [
            "objectTitle", "originalImageURL", "medThumbImageURL"
        ]
    });
};

module.exports.getAvailableMatchFns = function (req, res) {
    return res.json({
        availableMatchFns: Object.keys(processing.MatchFns)
    });
};

module.exports.download = function (req, res) {
    if (!req.params.id)
        return res.json({error: 'No ID given'});

    datasource_description.findById(req.params.id)
        .lean()
        .deepPopulate('schema_id _team schema_id._team')
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

module.exports.initializeToImport = function (req, res) {
    if (!req.body.uid) return res.json({error: 'No UID given'});

    var uid = req.body.uid;

    // Remove the previous results
    var batch = new Batch();
    batch.concurrency(1);

    var description;
    var srcDocPKey;
    batch.push(function (done) {
        datasource_description.findOne({uid: uid}, function (err, data) {
                if (err) return done(err);
                if (!data) return done(new Error('No datasource exists : ' + uid));

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

    batch.end(function (err) {
        if (err) return res.json({error: err.message});

        res.json({uid: uid});
    });
};

module.exports.preImport = function (req, res) {
    if (!req.body.uid) return res.json({error: 'No UID given'});

    var uid = req.body.uid;

    res.writeHead(200, {'Content-Type': 'application/json'});
    res.connection.setTimeout(0); // this could take a while

    datasource_description.GetDescriptionsToSetup([uid], function (descriptions) {
        var fn = function (err) {
            if (err) {
                if (err.code == 'ECONNRESET' || err.code == 'ENOTFOUND' || err.code == 'ETIMEDOUT') {
                    winston.info("🔁  Waiting 3 seconds to restart...");
                    setTimeout(function () {
                        import_controller.Import_dataSourceDescriptions__enteringImageScrapingDirectly(descriptions, fn);
                    }, 3000);
                } else {
                    res.end(JSON.stringify({error: err.message})); // error code
                }
            } else {
                res.end(JSON.stringify({uid: uid})); // all good
            }
        };

        import_controller.Import_dataSourceDescriptions(descriptions, fn);

    });
}

module.exports.postImport = function (req, res) {
    if (!req.body.uid) {
        return res.json({error: 'No UID given'});
    }

    var uid = req.body.uid;



    datasource_description.GetDescriptionsToSetup([uid], function (descriptions) {


        var fn = function (err) {
            if (err) {
                res.json({error: err.message}); // error code
            } else {

                datasource_description.findOne({$or: [{uid: uid}, {dataset_uid: uid}]},function (err, dataset) {
                        if (err) return done(err);
                        if (!dataset) return done(new Error('No datasource exists : ' + uid));

                        dataset.dirty = 0;
                        dataset.imported = true;

                        dataset.save(function (err, updatedDataset) {
                            if (err) return res.json({error: err.message});
                            if (!updatedDataset) return res.json({error: 'Invalid Operation'});

                            return res.json({dataset: dataset});
                        });
                    });
            }
        };

        postimport_caching_controller.GeneratePostImportCaches(descriptions, fn);
    });
};

module.exports.removeSubdataset = function(req, res) {
    if (!req.body.id)
        return res.json({error: 'No ID given'});

    datasource_description.findById(req.body.id, function (err, doc) {
        if (err) {
            winston.error("❌  Error encountered during find description : ", err);
            return res.json({error: err.message});
        }
        if (!doc) return res.json({success: 'Not available'});

        doc.remove(function(err) {
            if (err) {
                winston.error("❌  Error encountered during remove description : ", err);
                return res.json({error: err.message});
            }
            winston.info("✅  Removed the datasource description : " + doc.id);
            res.json({success: 'ok'});
        });
    });
};
