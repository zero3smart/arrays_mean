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

var raw_row_objects = require('../../models/raw_row_objects');

var queue = require.main.require('./queue-init').queue;

var initJob = require.main.require('./queue-init').initJob;


/*  start queue functions */

queue.process('preImport',function(job,done) {

    var id = job.data.id;

    var batch = new Batch();
    batch.concurrency(1);

    var description;
    var srcDocPKey;

    batch.push(function (done) {

        datasource_description.findById(id)
        .lean()
        .deepPopulate('schema_id _team schema_id._team')
        .exec(function (err, data) {
                if (err) return done(err);
                if (!data) return done(new Error('No datasource exists : ' + uid));

                description = data;

                if (description.schema_id) { //merge with parent description
                    description = datasource_description.Consolidate_descriptions_hasSchema(description);
                } else {
                     srcDocPKey = raw_source_documents.NewCustomPrimaryKeyStringWithComponents(description.uid, description.importRevision);
                }
                done();
            });
    });


    // Remove source document
    
    batch.push(function (done) {

        if (!description.dataset_uid) {

            raw_source_documents.Model.findOne({primaryKey: srcDocPKey}, function (err, document) {
                if (err) return done(err);
                if (!document) return done();

                winston.info("✅  Removed raw source document : " + srcDocPKey + ", error: " + err);
                document.remove(done);
                done();
            });
        } else {
            done();
        }
    });



    // Remove raw row object
    batch.push(function (done) {

        if (!description.dataset_uid) {

             mongoose_client.dropCollection('rawrowobjects-' + srcDocPKey, function (err) {
                // Consider that the collection might not exist since it's in the importing process.
                if (err && err.code != 26) return done(err);

                winston.info("✅  Removed raw row object : " + srcDocPKey + ", error: " + err);
                done();
            })

        } else {
            done();
        }

    });


    batch.end(function (err) {
        if (err) return done(err);
       import_controller.Import_rawObjects([description],job,function(err) {
            if (err) {
                console.log('err in queue processing preImport job: %s',err);
                return done(err);
            }
            done();
       })
    });


})


queue.process('scrapeImages', function(job,done) {
    var id = job.data.id;

    var batch = new Batch();
    batch.concurrency(1);

    var description;
    var description_schemaId;
    batch.push(function(done) {
        datasource_description.findById(id)
        .lean()
        .deepPopulate('schema_id _team schema_id._team')
        .exec(function(err,data) {
            if (err) return done(err);
            if (!data) return done(new Error('No datasource exists : ' + uid));

            description = data;

             if (description.schema_id) { //merge with parent description
                description_schemaId = description.schema_id.id;
                description = datasource_description.Consolidate_descriptions_hasSchema(description);
            } 
            done();
        })
    })

    batch.push(function(done) {
        import_controller.Import_dataSourceDescriptions__enteringImageScrapingDirectly([description],job,function(err) {
            if (err) return done(err);
            done();
        })
    })

    batch.end(function(err) {

        if (!err) {
            var updateQuery =  {$set: {dirty:0,imported:true}};
            var multi = {multi: true};
            if (description.schema_id) {
                 datasource_description.update({$or: [{_id:id}, {_id: description_schemaId}]}, updateQuery,multi,done);

            } else {
                 datasource_description.update({$or: [{_id:id}, {_otherSources: id}]}, updateQuery,multi,done);

            }
           
            
        }
       

    })





})


queue.process('importProcessed',function(job,done) {
    var id = job.data.id;

    // need to delete processed row object

    var batch = new Batch();
    batch.concurrency(1);

    var description;
    var srcDocPKey;


    // ----> find srcPkey


    batch.push(function (done) {

        datasource_description.findById(id)
        .lean()
        .deepPopulate('schema_id _team schema_id._team')
        .exec(function (err, data) {
            if (err) return done(err);
            if (!data) return done(new Error('No datasource exists : ' + uid));

            description = data;

             if (description.schema_id) { //merge with parent description
                description = datasource_description.Consolidate_descriptions_hasSchema(description);
            } else {
                srcDocPKey = raw_source_documents.NewCustomPrimaryKeyStringWithComponents(description.uid, description.importRevision);
            }

            done();
        });
    });

 
    // --> remove processed row object

    batch.push(function (done) {
        if (!description.dataset_uid) {

            mongoose_client.dropCollection('processedrowobjects-' + srcDocPKey, function (err) {
                // Consider that the collection might not exist since it's in the importing process.
                if (err && err.code != 26) return done(err);

                winston.info("✅  Removed processed row object : " + srcDocPKey + ", error: " + err);
                done();
            });

        } else {
            done();
        }
    });


    batch.push(function(done) {
        if (!description.dataset_uid) { 
            var raw_row_objects_forThisDescription = raw_row_objects.Lazy_Shared_RawRowObject_MongooseContext(srcDocPKey).forThisDataSource_RawRowObject_model
            raw_row_objects_forThisDescription.count(function(err,numberOfDocs) {
                if (err) return done(err);
                raw_source_documents.Model.update({primaryKey: srcDocPKey},{$set: {numberOfRows: numberOfDocs}},function(err) {
                     winston.info("✅  Updated raw source document number of rows to the raw doc count : " + srcDocPKey);
                    done(err);
                })
            })

        } else {
            done();
        }
    })





    batch.end(function (err) {
        if (err) return done(err);
        import_controller.PostProcessRawObjects([description],job,function(err) {
             if (err) {
                console.log('err in queue processing import processed job : %s',err);
                return done(err);
            }
            done();
        })
    });

})

queue.process('postImport',function(job,done) {
    var id = job.data.id;
    var description;

    var description_schemaId;

    var batch = new Batch();
    batch.concurrency(1);

    batch.push(function(done) {
         datasource_description.findById(id)
        .lean()
        .deepPopulate('schema_id _team schema_id._team')
        .exec(function (err, data) {
            if (err) return done(err);
            if (!data) return done(new Error('No datasource exists : ' + uid));

            description = data;

             if (description.schema_id) { //merge with parent description
                description_schemaId = description.schema_id._id;
                description = datasource_description.Consolidate_descriptions_hasSchema(description);
            }
            done();
        });
    })


    batch.push(function(done) {
        postimport_caching_controller.GeneratePostImportCaches([description],job,done);
    })

    batch.push(function(done) {
        var updateQuery =  {$set: {dirty:0,imported:true}};
        var multi = {multi: true};
        if (description_schemaId) { //update parent 
            datasource_description.update({$or: [{_id:id}, {_id: description_schemaId}]}, updateQuery,multi,done);

        } else {
            datasource_description.update({$or:[{_id:id}, {_otherSources:id}]}, updateQuery, multi,done);

        }
    })

    batch.end(function(err) {
         if (err) {
            console.log('err in queue updating post import caches : %s',err);
            return done(err);
        } else {
            done(null);
        }

    })
})

/* end queue functions */


function getAllDatasetsWithQuery(query, res) {

    datasource_description.find({$and: [{schema_id: {$exists: false}}, query]}, {
        _id: 1,
        uid: 1,
        title: 1,
        importRevision: 1
    }, function (err, datasets) {
        if (err) {
             return res.status(500).send(err);
        }
        return res.json({datasets: datasets});
    })
}




module.exports.getDependencyDatasetsForReimporting = function(req,res) {
    datasource_description.findById(req.params.id,function(err,currentSource) {
        if (err) return res.status(500).send(err);
        if (currentSource == null) {
            return res.json({datasets:[]})
        }
        var uid = currentSource.uid;
        var importRevision = currentSource.importRevision;
        

        datasource_description.datasetsNeedToReimport(req.params.id,uid,importRevision,function(err,jsonObj) {
            if (err) return res.status(500).send(err);
            return res.json(jsonObj);
        })
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
    if (!req.body.id) return res.status(500).send('No ID given');

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


    //remove resources in s3
    batch.push(function(done) {
        datasource_file_service.deleteDataset(description,done);
    })



    // Remove datasource description with schema_id
    batch.push(function (done) {
        // winston.info("✅  Removed datasource description : " + description.title);

        datasource_description.find({schema_id: description._id})
        .populate('_team')
        .exec(function (err, results) {
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

        datasource_description.find({_otherSources:description._id,"relationshipFields.by.andOtherRawSrcImportRevision":description.importRevision,
            "relationshipFields.by.ofOtherRawSrcUID":description.uid},function(err,docs) {
            if (err) {
                done(err);
            } else {
                if (docs.length == 0) {
                    done();
                } 
                for (var i = 0; i < docs.length; i++) {
                    var batch = new Batch();
                    batch.concurrency(5);

                    batch.push(function(done) {
                        var index = docs[i]._otherSources.indexOf(description.uid);
                        docs[i]._otherSources.splice(index,1);

                        docs[i].relationshipFields = docs[i].relationshipFields.filter(function(field) {
                          
                            return field.by.andOtherRawSrcImportRevision !== description.importRevision && 
                                field.by.ofOtherRawSrcUID !== description.uid
                        })
                        docs[i].save(done);
                    })
                    batch.end(function(err) {
                        winston.info("✅  Removed all the merged description settings inherited to the datasource description : " + description._id);
                        done(err);
                    });
                }
            }
        })
    })



     batch.push(function(done) {
        datasource_description.update({_otherSources: description._id}, {
            $pull: {
                "_otherSources" : description._id
            }
        },{multi: true},done);
    })


    // Remove datasource description
    batch.push(function (done) {
        description.remove(done);
    });



    batch.push(function(done) {
        User.update({$or: [{_editors:req.body.id},{_viewers: req.body.id}]},{$pull: {_editors: req.body.id,_viewers:req.body.id}},done);
    });

    batch.end(function (err) {
        if (err) {
            winston.error("❌  Error encountered during raw objects remove : ", err);
            return res.status(500).send(err);
        }
        winston.info("✅  Removed dataset : " + description.title);
        return res.status(200).send('ok');
    });
};

module.exports.get = function (req, res) {

    if (!req.params.id)
        return res.status(500).send('No ID given');

    datasource_description.findById(req.params.id)
        .lean()
        .deepPopulate('schema_id _team schema_id._team')
        .exec(function (err, description) {

            if (err) return res.status(500).send(err);
            if (!description) return res.status(404).send('Dataset not found');

            if (description.schema_id) {
                description = datasource_description.Consolidate_descriptions_hasSchema(description);
            }

            if (!req.session.columns) req.session.columns = {};

            if (description.uid && !req.session.columns[req.params.id]) {


                _readDatasourceColumnsAndSampleRecords(description, datasource_file_service.getDatasource(description).createReadStream(), function (err, columns) {
                    if (err) return res.status(500).send(err);

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
    if (!req.params.pKey) return res.status(500).send('Invalid parameter.');

    var split = req.params.pKey.split("-");

    


    var query = {uid: split[0], importRevision: parseInt(split[1].substring(1))};



    datasource_description.findOne(query)
        .populate('_team')
        .lean()
        .exec(function (err, description) {
            if (err) return res.status(500).send(err);

            if (!req.session.columns) req.session.columns = {};

          
            if (description.uid && !req.session.columns[description._id]) {

                _readDatasourceColumnsAndSampleRecords(description, datasource_file_service.getDatasource(description).createReadStream(), function (err, columns) {
                    if (err) return res.status(500).send(err);

                    req.session.columns[description._id] = columns;
                    columns = columns.concat(description.customFieldsToProcess.map(function(customField) {
                        return {name: customField.fieldName} ;
                    }));

                    res.json({
                        cols: columns.filter(function (e) {
                            return !description.fe_excludeFields || !description.fe_excludeFields[e.name];
                        })
                    });
                });
            } else {
                if (req.session.columns[description._id]) {
                    var columns = req.session.columns[description._id];
                    columns = columns.concat(description.customFieldsToProcess.map(function(customField) {
                        return {name: customField.fieldName} ;
                    }));

                    return res.json({
                        cols: columns.filter(function (e) {
                            return !description.fe_excludeFields || !description.fe_excludeFields[e.name];
                        })
                    });

                }
                else
                    return res.status(500).send('Invalid parameter');
            }
        });
};

module.exports.getAdditionalSourcesWithSchemaID = function (req, res) {
    if (!req.params.id) return res.status(500).send('No SchemaID given');


    datasource_description.find({schema_id: req.params.id})
        .lean()
        .deepPopulate('schema_id _team schema_id._team')
        .exec(function (err, sources) {
            if (err) return res.status(500).send( "Error getting the additional datasources with schema id : " + req.params.id);
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

module.exports.skipImageScraping = function(req,res) {
    datasource_description.findByIdAndUpdate(req.body.id, {$set: {skipImageScraping: req.body.skipImageScraping}},function(err,savedDesc) {
         if (err) {
            res.status(500).send({error: err.message});
        } else {
            res.status(200).send('ok');
        }
    })
}


module.exports.update = function (req, res) {

    if (!req.body._id) {

        // Creating of New Dataset
        datasource_description.create(req.body, function (err, doc) {
            if (err) {
                return res.status(500).send(err);
            } else {

                Team.findById(req.body._team, function (err, team) {
                    if (err) {
                        return res.status(500).send(err);
                    } else {
                        team.datasourceDescriptions.push(doc.id);
                        team.save(function (err, saved) {
                            if (err) return res.status(500).send(err);
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

                if (err) return res.status(500).send(err);
                if (!doc) return res.status(500).send('Invalid Operation');

                var description = doc, description_title = doc.title;
                if (doc.schema_id) {
                    description = datasource_description.Consolidate_descriptions_hasSchema(doc);
                    description_title = description.title + ' (' + doc.dataset_uid + ')';
                }
                winston.info("🔁  Updating the dataset " + description_title + "...");


                _.forOwn(req.body, function (value, key) {
                    if (key != '_id' && ((!doc.schema_id && !_.isEqual(value, doc._doc[key]))
                        || (doc.schema_id && !_.isEqual(value, description[key])))) {

                        winston.info('  ✅ ' + key + ' with ' + JSON.stringify(value));

                        doc[key] = value;
                        if (typeof value === 'object')
                            doc.markModified(key);
                    }
                });


                doc.save(function (err, updatedDoc) {
                    if (err) return res.status(500).send(err);
                    if (!updatedDoc) return res.status(500).send('Invalid Operation');

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
                                if (err) return res.status(500).send(err);
                                if (!updatedDoc) return res.status(500).send('Invalid Operation');

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
    if (!req.body.id) return res.status(500).send('No ID given');

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
                description.dirty = 1; // Full Import with image scraping

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
                    dirty: 1,
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
    if (!req.params.id) return res.status(500).send('Invalid parameter');

    datasource_description.findById(req.params.id)
        .lean()
        .deepPopulate('schema_id _team schema_id._team')
        .exec(function (err, description) {

            if (err) return res.status(500).send(err);
            if (!description) return res.status(404).send('Dataset not found');

            if (description.schema_id) {
                description = datasource_description.Consolidate_descriptions_hasSchema(description);
            }

            var fileName = datasource_file_service.fileNameToUpload(description);
            fileName += '.' + description.format.toLowerCase();
            res.attachment(fileName);

            datasource_file_service.getDatasource(description).createReadStream().pipe(res);

        });
}



module.exports.preImport = function (req, res) {

    initJob(req.params.id, 'preImport',function(err,jobId) {
        if (err) res.status(500).send(err);
        return res.status(200).send('ok');
    })
}

module.exports.getJobStatus = function(req,res) {
    var datasetId = req.params.id;
    datasource_description.findById(datasetId)
    .select({jobId: 1})
    .exec(function(err,queryingDataset) {
        if (err) return res.status(500).send(err);
        return res.json({id:queryingDataset.jobId});
    })
}


module.exports.importProcessed = function(req, res) {

     initJob(req.params.id,'importProcessed',function(err,jobId) {
        if (err) res.status(500).send(err);
        return res.status(200).send('ok');
    })
}



module.exports.scrapeImages = function(req, res) {

     initJob(req.params.id,'scrapeImages',function(err,jobId) {
        if (err) res.status(500).send(err);
        return res.status(200).send('ok');
    })
}


module.exports.postImport = function (req, res) {

     initJob(req.params.id,'postImport',function(err,jobId) {
        if (err) res.status(500).send(err);
        return res.status(200).send('ok');
    })
};

module.exports.removeSubdataset = function(req, res) {
    if (!req.body.id) return res.status(500).send('Invalid parameter');

    datasource_description.findById(req.body.id, function (err, doc) {
        if (err) {
            winston.error("❌  Error encountered during find description : ", err);
           return res.status(500).send(err);
        }
        if (!doc) return res.status(200).send('ok');

        doc.remove(function(err) {
            if (err) {
                winston.error("❌  Error encountered during remove description : ", err);
                return res.status(500).send(err);
            }
            winston.info("✅  Removed the datasource description : " + doc.id);
            return res.status(200).send('ok');
        });
    });
};
