var winston = require('winston');
var datasource_description = require('../../../models/descriptions');
var mongoose_client = require('../../../models/mongoose_client');
var mongoose = require('mongoose');
var Team = require('../../../models/teams');
var User = require('../../../models/users');
var _ = require('lodash');
var async = require('async');
var Batch = require('batch');
var aws = require('aws-sdk');
var fs = require('fs');
var es = require('event-stream');
var parse = require('csv-parse');
var moment = require('moment');
var datasource_file_service = require('../../../libs/utils/aws-datasource-files-hosting');
var imported_data_preparation = require('../../../libs/datasources/imported_data_preparation');
var datatypes = require('../../../libs/datasources/datatypes');
var s3ImageHosting = require('../../../libs/utils/aws-image-hosting');

var hadoop = require('../../../libs/datasources/hadoop');

var processing = require('../../../libs/datasources/processing');
var nodemailer = require('../../../libs/utils/nodemailer');

var queue = require.main.require('./queue-init')();
require('../../../libs/import/queue-worker');

var kue = require('kue');


function getAllDatasetsWithQuery(query, res) {

    if (query.master_id) { //getting the preview copy
        datasource_description.findOne(query,function(err,dataset) {
            if (err) {
                 return res.status(500).send(err);
            }
            return res.status(200).json({datasets: dataset});
        })
    } else {

    
        datasource_description.find({$and: [{master_id: {$exists:false},schema_id: {$exists: false}}, query]}, {
            _id: 1,
            uid: 1,
            title: 1,
            importRevision: 1,
            sample: 1
        }, function (err, datasets) {

            if (err) {
                 return res.status(500).send(err);
            }
            return res.status(200).json({datasets: datasets});
        })

    }

    
}




module.exports.getDependencyDatasetsForReimporting = function(req,res) {

    datasource_description.findById(req.params.id,function(err,currentSource) {
        if (err) return res.status(500).send(err);
        if (currentSource == null) {
            return res.json({datasets:[]})
        }
        var uid = currentSource.uid;
        var importRevision = currentSource.importRevision;
        

        datasource_description.datasetsNeedToReimport(req.params.id,function(err,jsonObj) {
            if (err) return res.status(500).send(err);
            return res.json(jsonObj);
        })
    })

} 


module.exports.killJob = function(req,res) {

    var batch = new Batch();
    batch.concurrency(1);

    var datasetId = req.params.id;

    batch.push(function(done) {

        datasource_description.findById(datasetId,function(err,dataset){
            if (dataset.jobId !== 0) {
                batch.push(function(done) {
                    kue.Job.get(dataset.jobId,function(err,job) {
                        if (err && err.message.indexOf("doesnt exist") == -1) {
                            done(err);
                        } else {
                            batch.push(function(done) {
                                job.remove(done);
                            })
                        }
                        done();
                    })
                })
                dataset.jobId = 0;
                dataset.save(done);
            }
        })

    })
    batch.end(function(err) {
        if (err) {
            return res.status(500).json(err);  
        } 
        return res.status(200).send('ok');
    })
}


module.exports.search = function(req,res) {


    datasource_description.find(req.query,function (err, foundDescriptions) {
        if (err) {
            res.send({error: err.message});
        } else {
            return res.status(200).json(foundDescriptions);
        }
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
            var key = description._team.subdomain + '/datasets/' + description._id + '/assets/banner/' + req.query.fileName;
            s3ImageHosting.signedUrlForPutObject(key, req.query.fileType, function (err, data) {
                if (err) {
                    return res.status(500).send(err);
                } else {
                    return res.json({putUrl: data.putSignedUrl, publicUrl: data.publicUrl});
                }
            })
        })

};

module.exports.approvalRequest = function(req,res) {
    var datasetId = req.params.id;

    var batch = new Batch();
    batch.concurrency(1);

    var dataset;

    batch.push(function(done) {

        datasource_description.findOne({_id:datasetId})
        .populate('author _team')
        .exec(function(err,d) {
            if (err) done(err);
            else {
                dataset = d;
                done();
            }
        })
    })

    batch.push(function(done) {
        if (req.body.state == 'pending') {
            if (dataset.state == 'pending') return done(); //re-submitting request? should not be happening
        }
        dataset.state = req.body.state;
        done();

    })

    batch.push(function(done) {
        dataset.save(function(err) {
            if (err) return done(err);
            if (dataset.state == 'pending') {
                nodemailer.newVizWaitingForApproval(dataset,done);
            } else {
                if (!dataset.author.isSuperAdmin()) {
                    nodemailer.notifyVizApprovalAction(dataset,done);
                }
                
            }
        })
    })

    batch.end(function(err) {
        if (err) res.status(500).send(err);
        else {

            res.json(dataset);
        }

    })

}

module.exports.deleteSource = function(req,res) {
    if (!req.params.id) {
        return res.status(500).json({err: 'Invalid parameter'});
    }

    datasource_description.findById(req.params.id)
    .populate('_team')
    .exec(function(err,description) {
        var key = description._team.subdomain + '/datasets/' + description.uid + '/datasources/' + description.uid + '_v' + description.importRevision;
        datasource_file_service.deleteObject(key,function(err,result) {
            if (err) return res.status(500).json(err);
            description.fileName = null;
            description.save();
            return res.status(200).json(result);
        })

    })

}

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
            done();
        });
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
    
     
        datasource_description.find({$or:[{schema_id:description._id}, {master_id:description._id}]})
        .populate('_team')
        .exec(function (err, results) {
            if (err) return done(err);

            results.forEach(function (element) {     
                element.remove();
            });
            winston.info("✅  Removed all the schema descriptions and working draft inherited to the datasource description : " + description._id);
            done();

        });
    });

    batch.push(function(done) {

        datasource_description.find({_otherSources:description._id,"relationshipFields.by.joinDataset":description._id.toString()},function(err,docs) {

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
                          
                            return field.by.joinDataset !== description._id.toString();
                        })
                        docs[i].dirty = 1;
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
        .populate('author')
        .deepPopulate('schema_id _team schema_id._team')
        .exec(function (err, description) {

            if (err) return res.status(500).send(err);
            if (!description) return res.status(404).send('Dataset not found');

            if (description.schema_id) {
                description = datasource_description.Consolidate_descriptions_hasSchema(description);
            }
          
            if (!req.session.columns) req.session.columns = {};

            if (description.connection) { //remote, read cols

                if (req.session[req.params.id] && req.session[req.params.id].tables && req.session[req.params.id].columns && 
                    req.session[req.params.id] && req.session[req.params.id].columns[description.connection.tableName]) {
                    description.columns =  req.session[req.params.id].columns[description.connection.tableName];
                    description.tables = req.session[req.params.id].tables;
                    return res.status(200).json({dataset: description});
                } 

                if (description.connection.type == 'hadoop') {

                    var batch = new Batch();
                    batch.concurrency(1);

                    if (!req.session[req.params.id] || !req.session[req.params.id].tables) {

                        batch.push(function(done) {
                            hadoop.initConnection({url:description.connection.url},function(err,tables) {
                                if (err) return done(err);
                                req.session[req.params.id].tables = tables;
                                done();

                            })
                        })  
                    }

                    batch.push(function(done) {

                        hadoop.readColumnsAndSample({url:description.connection.url},description.connection.tableName,function(err,data) {
                            if (err) return done(err);
                            if (!req.session[req.params.id].columns) req.session[req.params.id].columns = {};
                            req.session[req.params.id].columns[description.connection.tableName] = data;
                            done();
                        })
                    })


                    batch.end(function(err) {
         

                        if (err) return res.status(500).json(err);
                        description.columns = req.session[req.params.id].columns[description.connection.tableName];
                        description.tables = req.session[req.params.id].tables;
                        return res.status(200).json({dataset: description});
                    })


                }


            } else {

                if (description.uid && description.fileName && !req.session.columns[req.params.id]) {

                    _readDatasourceColumnsAndSampleRecords(description, datasource_file_service.getDatasource(description).createReadStream(), function (err, columns) {
                        if (err) return res.status(500).json(err);

                        req.session.columns[req.params.id] = columns;
                        description.columns = columns;
                        return res.status(200).json({dataset: description});
                    });

                } else {

                    if (req.session.columns[req.params.id]) description.columns = req.session.columns[req.params.id];

                    return res.status(200).json({dataset: description});
                }

            }
        });
};

module.exports.loadDatasourceColumnsForMapping = function (req, res) {
    if (!req.params.id) return res.status(500).send('Invalid parameter.');




    datasource_description.findById(req.params.id)
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
            return res.status(200).json({
                sources: sources.map(function (source) {
                    return datasource_description.Consolidate_descriptions_hasSchema(source);
                })
            });
        });
};



module.exports.update = function(req,res) {

    datasource_description.findByIdAndUpdate(req.params.id,{$set:req.body},function(err,savedDesc){
        if (err) return res.status(500).json({error: err.message});
        else {
            return res.status(200).send('ok');
        }
    })
}

module.exports.draftAction = function(req,res) {
    var datasetId = req.params.id;
    var action = req.query.action;

    async.waterfall([
        function(callback) {
            datasource_description.findOne({master_id: datasetId},function(err,draft) {
                if (err) return callback(err);
                else {
                    if (action == 'apply') {
                        return callback(null,draft,draft.fe_views);
                    }
                    callback(null,draft,null);
                }
            })
        }, function(draft,draftView,callback) {
            if (draftView) { //apply the changes
                datasource_description.findByIdAndUpdate(req.params.id,{$set: {fe_views:draftView}}, {new:true},function(err,updateQuery) {
                    if (err) callback(err);
                    else callback(null,draft,updateQuery.fe_views);
                })
            } else callback(null, draft,null); //revert the changes, return null, no need update original dataset

        }, function(draft,finalView,callback) {
            //delete draft
            draft.remove(function(err) {
                callback(err,finalView);
            })
        }
    ],function(err,finalView) {

        if (err) {
            console.log(err);
            res.status(500).send(err);
        }
        else return res.json({finalView: finalView});

    })



}

module.exports.save = function (req, res) {   

    if (!req.body._id) {

        // Creating of New Dataset

        async.waterfall([
            function(callback){
                datasource_description.create(req.body,function(err,doc) {
                    if (err) callback(err);
                    else callback(null,doc._id);
                })
            },
            function(mainDatasetId,callback) {
                Team.findById(req.body._team,function(err,team) {
                    if (err) callback(err);
                    else {
                        team.datasourceDescriptions.push(mainDatasetId);
                        team.save(function(err,saved) {
                            callback(err,mainDatasetId);
                        })
                    }
                })

            }
        ],function(err,docId) {
            if (err) return res.status(500).send(err);
            return res.json({id:docId});
        })

    } else {

        function twoAreEqual(a,b) {
            return _.isEqual(a,b) || JSON.stringify(a) == JSON.stringify(b);
        }

        // Update of Existing Dataset
        async.waterfall([
            function(callback) {
                datasource_description.findById(req.body._id)
                .lean()
                .populate('schema_id _team')
                .populate('author')
                .exec(function(err,doc) {
                    if (err) callback(err);
                    else if (!doc) callback(new Error('No Dataset Found for Update'));
                    else callback(null,doc);
                })
            }, 
            function(doc,callback) {
                var description = doc, description_title = doc.title;
                if (doc.schema_id) {
                    description = datasource_description.Consolidate_descriptions_hasSchema(doc);
                    description_title = description.title + ' (' + doc.dataset_uid + ') ';
                    winston.info("🔁  Updating the dataset " + description_title + "...");
                }
                var update = {$set:{}};
                var makeCopy = false;

    

                _.forOwn(req.body,function(value,key) {
        
                    if (key !='author' && key !== '_team' 
                        && key!='createdAt' && key != '_id' && ( (!doc.schema_id && !twoAreEqual(value, doc[key]))
                        || (doc.schema_id && !twoAreEqual(value, description[key])))) {

                        winston.info('  ✅ ' + key + ' with ' + JSON.stringify(value));
                        
                        update.$set[key] = value;
            
                        if (key == 'title') {
                            update.$set["uid"] = value.replace(/\.[^/.]+$/, '').toLowerCase().replace(/[^A-Z0-9]+/ig, '_');
                        }
                        if (key == 'fe_views') makeCopy = true;
                        
                        if (key == 'connection' && !value.join && req.session.columns[req.body._id + "_join"]) {
                            console.log('cleared join session columns stored');
                            req.session.columns[req.body._id + "_join"];
                        }
                    }

                })

                if (Object.keys(update.$set).length == 0) { //nothing to update
                    callback(null,doc,false,null);
                } else {
                    if (!doc.imported || doc.imported == false || doc.imported == null || doc._team.isEnterprise) {
                        callback(null,doc,false,update);
                    } else callback(null,doc,makeCopy,update); 
                }
            }, 
            function(doc,makeCopy,updateStatement,callback) {

                if (updateStatement !== null && makeCopy == false) {
                    var datasetId = mongoose.Types.ObjectId(doc._id);

                    datasource_description.findOneAndUpdate({_id: datasetId},updateStatement,function(err) {
                        if (err) callback(err);
                        else {
                            if (doc.schema_id) {
                                var findQuery = {_id: doc._id};
                                var updateQuery = {
                                    $unset :{
                                        isPublic: 1,
                                        customFieldsToProcess : 1,
                                        _otherSources: 1,
                                        fe_image: 1,
                                        fe_filters: 1,
                                        fe_fieldDisplayOrder: 1,
                                        urls: 1,
                                        importRevision: 1
                                    }
                                }
                                 datasource_description.findOneAndUpdate(findQuery,updateStatement, {upsert: true,new: true},
                                    function(err,updated_doc) {
                                        if (err) callback(err);
                                        else if (!updated_doc) callback (new Error('No Updated Dataset Found'));
                                        else callback(null,doc,makeCopy,updateStatement);
                                    })
                            }  else callback(null,doc,makeCopy,updateStatement)
                        }

                    })
                } else if (makeCopy == true && updateStatement) callback(null,doc,makeCopy,updateStatement) 
                else callback(null,doc,false,updateStatement);

            }, function(doc,makeCopy,updateStatement,callback) {
                var datasetId = mongoose.Types.ObjectId(doc._id);
                if (makeCopy == true) {
                    var findQuery = {master_id:  datasetId};
                    var copy = {};
                    copy.master_id = datasetId;
                   
                    copy.fe_views = updateStatement.$set.fe_views;
                   
                    //find the copy, if not create one
                    datasource_description.findOneAndUpdate(findQuery,copy,{upsert:true,new:true},
                        function(err,previewDataset) {
                            if (err) callback(err);
                            else callback(null,datasetId,previewDataset);
                    })
                } else callback(null,datasetId);

            }
        ],function(err,datasetId,previewDataset) {
            if (err) {
                console.log(err);
                res.status(500).send(err);
            }
            else return res.json({id: datasetId,preview: previewDataset});

        })





        // datasource_description.findById(req.body._id)
        //     .populate('schema_id')
        //     .populate('author')
        //     .exec(function (err, doc) {

        //         var auth = doc.author;        

        //         if (err) return res.status(500).send(err);
        //         if (!doc) return res.status(500).send('Invalid Operation');

        //         var description = doc, description_title = doc.title;
        //         if (doc.schema_id) {
        //             description = datasource_description.Consolidate_descriptions_hasSchema(doc);
        //             description_title = description.title + ' (' + doc.dataset_uid + ')';
        //         }
        //         winston.info("🔁  Updating the dataset " + description_title + "...");
                
        //         _.forOwn(req.body, function (value, key) {
    
        //             if (key != '_id' && ((!doc.schema_id && !_.isEqual(value, doc[key]))
        //                 || (doc.schema_id && !_.isEqual(value, description[key])))) {

        //                 winston.info('  ✅ ' + key + ' with ' + JSON.stringify(value));
                        
        //                 doc[key] = value;
                        
        //                 if (key == 'connection' && !value.join && req.session.columns[req.body._id + "_join"]) {
        //                     console.log('cleared join session columns stored');
        //                     req.session.columns[req.body._id + "_join"];
        //                 }
        //                 if (typeof value === 'object')
        //                     doc.markModified(key);


        //             }
        //         });
    
        //         if (!doc.schema_id) {
        //             doc.uid = doc.title.replace(/\.[^/.]+$/, '').toLowerCase().replace(/[^A-Z0-9]+/ig, '_');
        //         }

        //         // console.log(doc);
        //         doc.save(function (err, updatedDoc) {
        //             if (err) return res.status(500).send(err);
        //             if (!updatedDoc) return res.status(500).send('Invalid Operation');

        //             if (!doc.schema_id) {
        //                 return res.json({id: updatedDoc.id});
        //             } else {
        //                 var findQuery = {_id: doc.id};
        //                 // Inherited fields from the schema should be undefined
        //                 // TODO: Is there anyway to update the selected fields only?
        //                 var updateQuery = { $unset: {
        //                     imageScraping: 1,
        //                     isPublic: 1,
        //                     customFieldsToProcess: 1,
        //                     _otherSources: 1,
        //                     fe_filters: 1,
        //                     fe_fieldDisplayOrder: 1,
        //                     urls: 1,

        //                     importRevision: 1
        //                 } };
        //                 datasource_description.findOneAndUpdate(findQuery, updateQuery, {upsert: true, new: true},
        //                     function(err, updatedDoc) {
        //                         if (err) return res.status(500).send(err);
        //                         if (!updatedDoc) return res.status(500).send('Invalid Operation');

        //                         return res.json({id: updatedDoc.id});
        //                     });
        //             }
        //         });
        //     });

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
    var rowObjects = []

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
                            var numberOfEmptyFields = 0;
                            columns = output[0].map(function (e) {
                                // change any empty string keys to "Field"
                                if(e === '') {
                                    numberOfEmptyFields++;
                                    e = "Field" + numberOfEmptyFields;
                                }
                                return {name: e.replace(/\./g, '_')};
                            });
                            readStream.resume();
                        } else if (countOfLines == 2) {
                            columns = columns.map(function (e, i) {
                                var rowObject = intuitDataype(e.name, output[0][i]);
                                rowObjects.push(rowObject);
                                return rowObject
                            });
                            readStream.resume();
                        } else if (countOfLines == 3){
                            columns = columns.map(function (e, i) {
                            return verifyDataType(e.name, output[0][i], rowObjects, i)
                            });
                            readStream.resume();
                        } else {
                            readStream.destroy();
                            if (countOfLines == 4) next(null, columns);
                        }
                    });
            })
        );
}

function verifyDataType(name, sample, rowObjects, index) {
    var numberRE = /([^0-9\.,-]|\s)/;
    var rowObject = rowObjects[index]
    if(rowObject.operation == "ToDate" && !moment(sample, rowObject.input_format, true).isValid()) {
        var secondRowObject = intuitDataype(name, sample);
        rowObject.data_type = secondRowObject.data_type;
        rowObject.operation = secondRowObject.operation;

    } else if((rowObject.operation == "ToInteger" || rowObject.operation == "ToFloat") && numberRE.test(sample)) {
        var secondRowObject = intuitDataype(name, sample);
        rowObject.data_type = secondRowObject.data_type;
        rowObject.operation = secondRowObject.operation;
    }
    return rowObject;
};

function intuitDataype(name, sample) {
    var format = datatypes.isDate(sample)[1];
    if (format !== null) {
        return {name: name, sample: sample, data_type: 'Date', input_format: format, output_format: format, operation: 'ToDate'};
    }

    var dateRE = /(year|DATE)/i;
    if (dateRE.test(name)) {
        format = datatypes.isEdgeDate(sample)[1];
        if (format === 'ISO_8601') {
            return {name: name, sample: sample, data_type: 'Date', input_format: format, output_format: 'YYYY-MM-DD', operation: 'ToDate'};
        } else if (format !== null) {

            if (datatypes.isValidFormat(format)) {
                return {name: name, sample: sample, data_type: 'Date', input_format: format, output_format: format, operation: 'ToDate'};
            } else {
                var valid_format = datatypes.makeFormatValid(format);
                return {name: name, sample: sample, data_type: 'Date', input_format: format, output_format: valid_format, operation: 'ToDate'};
            }

        } else {
            return {name: name, sample: sample, data_type: 'Text', operation: 'ToString'};
        }
    }

    // if the sample has anything other than numbers and a "." or a "," then it's most likely a string
    var numberRE = /([^0-9\.,-]|\s)/;
    var floatRE = /[^0-9,-]/;
    var IdRE = /(Id|ID)/;
    if(numberRE.test(sample) || IdRE.test(name) || sample === "") {
        // if it's definitely not a number, double check to see if it's a valid ISO 8601 date
        format = datatypes.isISODateOrString(sample)[1];
        if(format !== null) {
            return {name: name, sample: sample, data_type: 'Date', input_format: format, output_format: 'YYYY-MM-DD', operation: 'ToDate'};
        }
    } else if(floatRE.test(sample)) {
        var numberWithoutComma = sample.replace(",", "");
        if (!isNaN(Number(numberWithoutComma))) {
            return {name: name, sample: sample, data_type: 'Number', operation: 'ToFloat'};
        }
    } else {
        var numberWithoutComma = sample.replace(",", "");
        if (!isNaN(Number(numberWithoutComma))) {
            return {name: name, sample: sample, data_type: 'Number', operation: 'ToInteger'};
        }
    }
    return {name: name, sample: sample, data_type: 'Text', operation: 'ToString'};
};
    

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
                //description refering to the master/parent dataset
                description = doc;
                description_title = description.title

                if (!child) {
                    doc.fileName = null;
                    doc.title = req.body.tempTitle;
                    doc.save();
                }
                done();


            })
    });

    if (child) {
        batch.push(function (done) {
            schema_description = description;

            var insertQuery = {
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
                    importRevision: 1,
                    useCustomview: 1,
                    skipImageScraping: 1,


                }
            };

            datasource_description.create(insertQuery,function(err,doc) {
                if (err) return done(err);
                doc.schema_id = schema_description;
                // description now referencing the child
                description = datasource_description.Consolidate_descriptions_hasSchema(doc);

                description_title = description.title + "(" + description.dataset_uid + ")";
                done();
            })

            // datasource_description.findOneAndUpdate(findQuery, insertQuery, {upsert: true, new: true}, function(err, doc) {
            //     if (err) return done(err);
            //     doc.schema_id = schema_description;
            //     // description now referencing the child
            //     description = datasource_description.Consolidate_descriptions_hasSchema(doc);

            //     description_title = description.title + "(" + description.dataset_uid + ")";
            //     done();
            // });
            
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
                description.fileName = file.originalname
            } else {
                return done(new Error('Invalid File Format : ' + file.mimetype + ', ' + ext));
            }

            // Verify that the file is readable & in the valid format.
            _readDatasourceColumnsAndSampleRecords(description, fs.createReadStream(file.path), function (err, columns) {
                if (err) {
                    winston.error("❌  Error validating datasource : " + file.originalname + " : error " + err.message);
                    return done(err);
                }
                winston.info("✅  File validation okay : " + file.originalname);

                // Store columnNames and firstRecords for latter call on dashboard pages
                if (!req.session.columns) req.session.columns = {};
                // TODO: Do we need to save the columns for the additional datasource,
                // since it should be same as the master datasource???
                req.session.columns[description._id] = columns;
                description.raw_rowObjects_coercionScheme = {};

                for(var i = 0; i < columns.length; i++) {
                    var column = columns[i];
                    if (column.data_type !== 'String') {
                        description.raw_rowObjects_coercionScheme[column.name] = {};
                        if (column.operation === 'ToDate') {
                            description.raw_rowObjects_coercionScheme[column.name]["outputFormat"] = column.output_format;
                            description.raw_rowObjects_coercionScheme[column.name]["format"] = column.input_format;
                        }
                        description.raw_rowObjects_coercionScheme[column.name]["operation"] = column.operation;
                    }
                }

                // Upload datasource to AWS S3

    
                if (!description.uid && !child) description.uid = imported_data_preparation.DataSourceUIDFromTitle(req.body.tempTitle);

                var uploadToDataset = description._id;

                if (child) uploadToDataset = req.body.id;

                datasource_file_service.uploadDataSource(file.path, file.originalname, file.mimetype, description._team.subdomain, uploadToDataset, function (err) {
                    if (err) {
                        winston.error("❌  Error during uploading the dataset into AWS : " + file.originalname + " (" + err.message + ")");
                    }

                    done(err);
                });
            });
        });

        batch.push(function (done) {
            winston.info("✅  Uploaded datasource : " + file.originalname);

            if (!child) {
                description.dirty = 1; // Full Import with image scraping
                datasource_description.findByIdAndUpdate(description._id, description, function (err, updatedDesc) {
                    if(err) {
                        winston.error("❌  Error saving the dataset raw row coercion update into the database, UID:  " + description.uid + " (" + err.message + ")");
                    }
                    done(err);
                });
            } else {
                var findQuery = {_id: description._id};
                // TODO: Need to update the selected fields only!
                var updateQuery = {
                    format: description.format,
                    fileName: description.fileName,
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
        return res.end(JSON.stringify({id: description._id,uid:description.uid, raw_rowObjects_coercionScheme: description.raw_rowObjects_coercionScheme}));
    });
};

module.exports.getAvailableTypeCoercions = function (req, res) {
    return res.json({availableTypeCoercions: datatypes.available_forFieldDataType_coercions()});
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
    var importedBy = req.user._id;

    console.log(importedBy);

    datasource_description.findByIdAndUpdate(req.params.id,{$set: {lastImportInitiatedBy: importedBy}})
    .exec(function(err) {
        if (err) return res.status(500).send(err);
        queue.initJob(req.params.id, 'preImport',function(err,jobId) {
            if (err) return res.status(500).send(err);
            return res.status(200).send('ok');
        })
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
    var importedBy = req.user._id;
    datasource_description.findByIdAndUpdate(req.params.id,{$set: {lastImportInitiatedBy: importedBy}})
    .exec(function(err) {
        if (err) return res.status(500).send(err);
        queue.initJob(req.params.id,'importProcessed',function(err,jobId) {
            if (err) return res.status(500).send(err);
            return res.status(200).send('ok');
        })
    })

}



module.exports.scrapeImages = function(req, res) {

    var importedBy = req.user._id;
    datasource_description.findByIdAndUpdate(req.params.id,{$set: {lastImportInitiatedBy: importedBy}})
    .exec(function(err) {
        if (err) return res.status(500).send(err);
        queue.initJob(req.params.id,'scrapeImages',function(err,jobId) {
            if (err) return res.status(500).send(err);
            return res.status(200).send('ok');
        })
    })
}


module.exports.postImport = function (req, res) {

    var importedBy = req.user._id;
    datasource_description.findByIdAndUpdate(req.params.id,{$set: {lastImportInitiatedBy: importedBy}})
    .exec(function(err) {
        if (err) return res.status(500).send(err);
        queue.initJob(req.params.id,'postImport',function(err,jobId) {
            if (err) return res.status(500).send(err);
            return res.status(200).send('ok');
        })
    })
};

module.exports.removeSubdataset = function(req, res) {
    if (!req.body.id) return res.status(500).send('Invalid parameter');

    datasource_description.findById(req.body.id)
    .deepPopulate('schema_id schema_id._team')
    .exec(function(err,doc) {
        if (err) {
            winston.error("❌  Error encountered during find description : ", err);
           return res.status(500).send(err);
        }
        var key = doc.schema_id._team.subdomain + '/datasets/' + doc.schema_id._id + '/datasources/' + doc.fileName;
        datasource_file_service.deleteObject(key,function(err,result) {
            if (err) return res.status(500).json(err);
            doc.remove(function(err) {
                if (err) {
                    winston.error("❌  Error encountered during remove description : ", err);
                    return res.status(500).send(err);
                }
                return res.status(200).send('ok');
            })
        })


    })
};


module.exports.deleteBanner = function (req, res) {
    if(req.user) {
        datasource_description.findById(req.params.id)
            .populate('_team', 'subdomain')
            .exec(function (err, description) {
            if(err) {
                console.log(err);
                return res.status(500).send({error: err})
            } else {
                if(description.banner.indexOf('http') >= 0) {
                    var key = description.banner.split("amazonaws.com")[1];
                } else {
                    var key = description._team.subdomain + "/datasets/" + description._id + "/assets/banner/" + description.banner;
                }
                datasource_file_service.deleteObject(key, function (err, data) {
                    if(err) {
                        console.log(err);
                        return res.status(500).send({error: err})
                    } else {
                        description.banner = undefined;
                        description.save();
                        return res.json({dataset: description})
                    }
                })
            }
        })
    }
}
