var winston = require('winston');
var aws = require('aws-sdk');
var fs = require('fs');
var es = require('event-stream');
var parse = require('csv-parse');
var Batch = require('batch');
var _ = require('lodash');
var async = require("async");

var datasource_description = require('../../../models/descriptions');
var datasource_upload_service = require('../../../libs/utils/aws-datasource-files-hosting');
var datatypes = require('../../../libs/datasources/datatypes');
var imported_data_preparation = require('../../../libs/datasources/imported_data_preparation')
var views = require('../../../models/views');
var import_raw_objects_controller = require('../../../libs/import/data_ingest/raw_objects_controller');
var raw_row_objects = require('../../../models/raw_row_objects');
var processed_row_objects = require('../../../models/processed_row_objects')
var raw_source_documents = require('../../../models/raw_source_documents');
var mongoose_client = require('../../../models/mongoose_client');

/***************  Get All Datasets  ***************/
module.exports.getAll = function (req, res) {
    res.setHeader('Content-Type', 'application/json');

    datasource_description.find({schema_id: {$exists: false}}, {
        _id: 1,
        title: 1,
        importRevision: 1
    }, function (err, datasets) {
        if (err) {
            winston.error("❌  Error getting all datasets: " + err.message);

            return res.send(JSON.stringify({
                error: err.message
            }))
        }
        return res.send(JSON.stringify({datasets: datasets}));
    });
};

module.exports.remove = function(req, res) {
    res.setHeader('Content-Type', 'application/json');

    if (!req.body.id)
        return res.send(JSON.stringify({error: 'No ID given'}));

    var batch = new Batch();
    batch.concurrency(1);

    var description;
    var srcDocPKey;
    batch.push(function(done) {
        datasource_description.findById(req.body.id, function(err, data) {
            if (err) return done(err);

            if (!data) return done(new Error('No datasource exists : ' + req.body.id));

            description = data;
            srcDocPKey = raw_source_documents.NewCustomPrimaryKeyStringWithComponents(description.uid, description.importRevision);
            done();
        });
    });

    // Remove source document
    batch.push(function(done) {

        raw_source_documents.Model.findOne({primaryKey: srcDocPKey}, function(err, document) {
            if (err) return done(err);

            if (!document) return done();
            document.remove(done);
        });
    });

    // Remove processed row object
    batch.push(function(done) {

        mongoose_client.dropCollection('processedrowobjects-' + srcDocPKey,done)

    });

    // Remove raw row object
    batch.push(function(done) {

        mongoose_client.dropCollection('rawrowobjects-' + srcDocPKey,done)

    });

    // Remove datasource description
    batch.push(function(done) {
        description.remove(done);
    });

    // Remove datasource description with schema_id
    batch.push(function(done) {
        datasource_description.find({schema_id: description._id}, function(err, results) {
            if (err) return done(err);

            var batch = new Batch();
            batch.concurrency(1);

            results.forEach(function(element) {
                batch.push(function(done) {
                    element.remove(done);
                });
            });

            batch.end(function(err) {
                done(err);
            });

        });
    });

    batch.end(function(err) {
        if (err)
            return res.send(JSON.stringify({error: err.message}));
        res.send(JSON.stringify({success: 'okay'}));
    });

    res.send(JSON.stringify({success: 'okay'}));
}

module.exports.update = function (req, res) {
    res.setHeader('Content-Type', 'application/json');

    if (!req.body.id)
        return res.send(JSON.stringify({error: 'No ID given'}));

    datasource_description.findById(req.params.id, function (err, doc) {
        if (err) return res.send(JSON.stringify({error: err.message}));
        if (!doc) return res.send(JSON.stringify({error: 'Invalid ID'}));

        return res.send(JSON.stringify({dataset: doc._doc}));
    });
};

/***************  Settings  ***************/
module.exports.get = function (req, res) {
    res.setHeader('Content-Type', 'application/json');

    if (!req.params.id)
        return res.send(JSON.stringify({error: 'No ID given'}));

    req.session.uploadData_columnNames = null;
    req.session.uploadData_firstRecord = null;

    datasource_description.findById(req.params.id, function (err, doc) {
        if (err) return res.send(JSON.stringify({error: err.message}));
        if (!doc) return res.send(JSON.stringify({error: 'Invalid ID'}));

        return res.send(JSON.stringify({dataset: doc._doc}));
    });
};

function _castSerializeElementToArray(field,reqBody) {
    var arrayField = field.replace('[]','');
    reqBody[arrayField] = [];

    if (typeof reqBody[field] == 'string') {
        if (reqBody[field] !== "") {
            reqBody[arrayField].push(reqBody[field]);
        }
    } else if (Array.isArray(reqBody[field])) {
        for (var i = 0; i < reqBody[field].length; i++) {
            if (reqBody[field][i] !== "") {
                reqBody[arrayField].push(reqBody[field][i])
            }
        }
    }
    delete reqBody[field];
}

function _castSerializeElementToObject(key,value,commaSeparated) {
    var objToReturn = {};
    for (var i = 0; i < key.length; i++) {
        if (i >= value.length) break;
        if (commaSeparated == true) {
             objToReturn[key] = value[i].split(",");

        } else {

            objToReturn[key[i]] = value[i]


        }


    }
    return objToReturn;
}

module.exports.saveSettings = function (req, next) {

    var data = {};

    for (var field in req.body) {
        if (field.indexOf('[]') >= 0) {
            _castSerializeElementToArray(field,req.body);
        }
    }

    req.body.fe_listed = req.body.fe_listed == 'true';

    if (req.params.id == 'new') {
        datasource_description.create(req.body, function (err, doc) {
            if (err) return next(err);

            data.id = doc.id;

            req.flash('message', 'Your settings are saved!');

            next(null, data);
        });
    } else {
        var query = {_id: req.params.id};
        datasource_description.findOneAndUpdate(query, req.body, {$upsert: true}, function (err, doc) {
            if (err) return next(err);

            if (doc)
                data.id = doc._doc._id;
            req.flash('message', 'Your settings are saved!');

            next(null, data);
        });
    }
};


/***************  Upload/Source  ***************/
module.exports.getSource = function (req, next) {
    var data = {};

    if (req.params.id) {
        datasource_description.findById(req.params.id, function (err, doc) {
            if (err) return next(err);

            if (doc) {
                data.doc = doc._doc;
            }

            // Get sub datasets
            datasource_description.find({schema_id: req.params.id}, {}, function(err, docs) {
                if (err) return next(err);

                if (docs && docs.length > 0)
                    data.sub_datasources = docs;
                else
                    data.sub_datasources = [doc._doc];

                next(null, data);
            });
        });
    } else {
        next(null, data);
    }
};

module.exports.saveSource = function (req, next) {
    var description;

    var batch = new Batch;
    batch.concurrency(1);

    batch.push(function (done) {
        datasource_description.findById(req.params.id)
            .exec(function (err, doc) {
                if (err) return done(err);

                description = doc;

                done();
            })
    });

    _.forEach(req.files, function (file) {
        batch.push(function (done) {

            // Verify that the file is readable & in the valid format.
            var countOfLines = 0;
            var cachedLines = '';

            var delimiter;
            if (file.mimetype == 'text/csv') {
                delimiter = ',';
                description.format = 'CSV';
            } else if (file.mimetype == 'text/tab-separated-values') {
                delimiter = '\t';
                description.format = 'TSV';
            } else {
                return done(new Error('Invalid File Format'));

            }


            var readStream = fs.createReadStream(file.path)
                .pipe(es.split())
                .pipe(es.mapSync(function (line) {
                    // pause the readstream
                    readStream.pause();

                    parse(cachedLines + line, {delimiter: delimiter, relax: true, skip_empty_lines: true},
                        function (err, output) {
                            if (err) {
                                readStream.destroy();
                                return done(err);
                            }

                            if (!output || output.length == 0) {
                                cachedLines = cachedLines + line;
                                return readStream.resume();
                            }

                            if (!Array.isArray(output[0]) || output[0].length == 1) {
                                readStream.destroy();
                                return done(new Error('Invalid File'));
                            }

                            cachedLines = '';
                            countOfLines++;

                            if (countOfLines == 1) {
                                readStream.resume();
                            } else if (countOfLines == 2) {
                                readStream.resume();
                            } else {
                                readStream.destroy();
                                if (countOfLines == 3) done(null);
                            }
                        });
                }));
        });

        batch.push(function (done) {
            if (!description.uid)
                description.uid = imported_data_preparation.DataSourceUIDFromTitle(description.title);
            var newFileName = datasource_upload_service.fileNameToUpload(description);
            datasource_upload_service.uploadDataSource(file.path, newFileName, file.mimetype, done);
        });

        batch.push(function (done) {
            description.save(function (err, updatedDescription) {
                if (err) return done(err);
                req.flash('message', 'Uploaded successfully');
                done();
            });
        });
    });

    batch.end(function (err) {
        if (err) {
            req.flash('error',err.message);

            req.session.uploadData_columnNames = null;
            req.session.uploadData_firstRecord = null;

            return next(err);
        }

        next();
    });
};


/***************  Format Data  ***************/
function _loadDatasourceColumnsAndSampleRecords(req, description, next) {
    var obj = {};

    var countOfLines = 0;
    var cachedLines = '';

    var delimiter;
    if (description.format == 'CSV') {
        delimiter = ',';
    } else if (description.format == 'TSV') {
        delimiter = '\t';
    }

    var readStream = datasource_upload_service.getDatasource(description).createReadStream()
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
                            obj.colNames = output[0];
                            req.session.uploadData_columnNames = obj.colNames;
                            // Sort By fe_fieldDisplayOrder
                            // data.colNames.sort(function(a, b) {
                            //    if (!description.fe_fieldDisplayOrder[b]) return -1;
                            //    else if (!desciption.fe_fieldDisplayOrder[a]) return 1;
                            //    return description.fe_fieldDisplayOrder[b] - description.fe_fieldDisplayOrder[a];
                            // });
                            readStream.resume();
                        } else if (countOfLines == 2) {
                            req.session.uploadData_firstRecord = output[0];
                            obj.firstRecord = output[0];
                            readStream.resume();
                        } else {
                            readStream.destroy();
                            if (countOfLines == 3) next(null, obj);
                        }
                    });
            })
        );
}

module.exports.getFormatData = function (req, next) {

    if (req.params.id) {
        var data = {};

        datasource_description.findById(req.params.id, function (err, doc) {
            if (err || !doc) return next(err);

            var description = doc
            data.doc = description;

            if (req.session.uploadData_firstRecord == null || req.session.uploadData_columnNames == null) {
                _loadDatasourceColumnsAndSampleRecords(req, description, function (err, obj) {
                    if (!err) {
                        data.colNames = obj.colNames;
                        data.firstRecord = obj.firstRecord;
                        return next(null, data);
                    } else {
                        return next(err);

                    }
                });
            } else {
                data.colNames = req.session.uploadData_columnNames;
                data.firstRecord = req.session.uploadData_firstRecord;
                next(null, data);
            }
        });

    }
};

module.exports.saveFormatData = function (req, next) {
    var data = {id: req.params.id};

    if (req.params.id) {
        var updateObject = {fn_new_rowPrimaryKeyFromRowObject: req.body.fn_new_rowPrimaryKeyFromRowObject};

        datasource_description.findOneAndUpdate({_id: req.params.id}, updateObject, {$upsert: true}, function (err, doc) {
            if (err) return next(err);

            if (doc != null) {
                data.doc = doc._doc;

                // TODO: We should not remove the rows if it's second uploaded file - schema_id is valid
                raw_row_objects.RemoveRows(doc, function(err) {
                    if (err) return next(err, data);

                    import_raw_objects_controller.ParseAndImportRaw(0, doc, function(err) {
                        if (err)
                            winston.info("❌  Error encountered during raw objects import:", err);

                        next(err, data);
                    });
                });
            } else {
                return next(err, data);
            }
        });
    }
};


/***************  Format Field  ***************/
module.exports.getFormatField = function (req, next) {
    var dataset_id = req.params.id;
    var field_name = req.params.field;
    var columnIndex = req.session.uploadData_columnNames.indexOf(field_name);

    if (!dataset_id || !field_name || columnIndex == -1) return next(new Error('Invalid parameter!'));

    var data = {
        id: dataset_id,
        field: field_name,
        firstRecord: req.session.uploadData_firstRecord[columnIndex],
        available_forFieldDataType_coercions: datatypes.available_forFieldDataType_coercions()
    };

    datasource_description.findById(dataset_id, function (err, doc) {
        if (err) return next(err);

        if (doc)
            data.doc = doc._doc;
        next(null, data);
    });
}

module.exports.saveFormatField = function (req, next) {
    var dataset_id = req.params.id;
    var field = req.params.field;





    if (!dataset_id || !field) return next(new Error('Invalid parameter!'));

    var data = {};

    field = field.replace(/\./g, "_");






    datasource_description.findById(dataset_id, function (err, doc) {
        if (err) return next(err);

        // Data Type Coercion
        if (!doc.raw_rowObjects_coercionScheme) doc.raw_rowObjects_coercionScheme = {};

        var coercion = {};

      

        if (req.body.dataType != null && typeof req.body.dataType != 'undefined') coercion.operation = req.body.dataType;
        if (req.body.dataFormat) coercion.format = req.body.dataFormat;
        if (req.body.dataOutputFormat) coercion.outputFormat = req.body.dataOutputFormat;

        if (Object.keys(coercion).length > 0) {
            doc.raw_rowObjects_coercionScheme[field] = coercion;
            doc.markModified("raw_rowObjects_coercionScheme");
        }

       

        // Exclude
        if (!doc.fe_excludeFields) doc.fe_excludeFields = [];
        var index = doc.fe_excludeFields.indexOf(field);
        if (req.body.exclude == 'true' && index == -1) {
            doc.fe_excludeFields.push(field);
        } else if (req.body.exclude != 'true' && index != -1) {
            doc.fe_excludeFields.splice(index, 1);
        }
        doc.markModified('fe_excludeFields');

        // Title Override
        if (!doc.fe_displayTitleOverrides) doc.fe_displayTitleOverrides = {};
        if (req.body.titleOverride != '' && typeof req.body.titleOverride != 'undefined') {
            doc.fe_displayTitleOverrides[field] = req.body.titleOverride;
        } else {
            delete doc.fe_displayTitleOverrides[field];
        }
        doc.markModified('fe_displayTitleOverrides');

        // Display Order
        if (!doc.fe_fieldDisplayOrder) doc.fe_fieldDisplayOrder = {};
        if (req.body.displayOrder)
            doc.fe_fieldDisplayOrder[field] = parseInt(req.body.displayOrder);
        doc.markModified('fe_fieldDisplayOrder');

        // Designated Field
        if (!doc.fe_designatedFields) doc.fe_designatedFields = {};
        if (req.body.designatedField != '' && typeof req.body.designatedField != 'undefined') {
            doc.fe_designatedFields[req.body.designatedField] = field;
        } else {
            delete doc.fe_designatedFields[req.body.designatedField];
        }



        doc.markModified('fe_designatedFields');

        // Filter notAvailable
        if (!doc.fe_filters) doc.fe_filters = {};
        if (!doc.fe_filters.fieldsNotAvailable) doc.fe_filters.fieldsNotAvailable = [];
        index = doc.fe_filters.fieldsNotAvailable.indexOf(field);
        if (req.body.filter_notAvailable == 'true' && index == -1) {
            doc.fe_filters.fieldsNotAvailable.push(field);
        } else if (req.body.filter_notAvailable != 'true' && index != -1) {
            doc.fe_filters.fieldsNotAvailable.splice(index, 1);
        }

      
        if (!doc.fe_filters.fieldsCommaSeparatedAsIndividual) doc.fe_filters.fieldsCommaSeparatedAsIndividual = [];
        index = doc.fe_filters.fieldsCommaSeparatedAsIndividual.indexOf(field);
        if (req.body.filter_commaSeparatedAsIndividual == 'true' && index == -1) {
            doc.fe_filters.fieldsCommaSeparatedAsIndividual.push(field);
        } else if (req.body.filter_commaSeparatedAsIndividual != 'true' && index != -1) {
            doc.fe_filters.fieldsCommaSeparatedAsIndividual.splice(index, 1);
        }

        // Filter multiSelectable
        if (!doc.fe_filters.fieldsMultiSelectable) doc.fe_filters.fieldsMultiSelectable = [];
        index = doc.fe_filters.fieldsMultiSelectable.indexOf(field);
        if (req.body.filter_multiSelectable == 'true' && index == -1) {
            doc.fe_filters.fieldsMultiSelectable.push(field);
        } else if (req.body.filter_multiSelectable != 'true' && index != -1) {
            doc.fe_filters.fieldsMultiSelectable.splice(index, 1);
        }

        // Filter sortableByInteger
        if (!doc.fe_filters.fieldsSortableByInteger) doc.fe_filters.fieldsSortableByInteger = [];
        index = doc.fe_filters.fieldsSortableByInteger.indexOf(field);
        if (req.body.filter_sortableByInteger == 'true' && index == -1) {
            doc.fe_filters.fieldsSortableByInteger.push(field);
        } else if (req.body.filter_sortableByInteger != 'true' && index != -1) {
            doc.fe_filters.fieldsSortableByInteger.splice(index, 1);
        }

        // Filter oneToOneOverrideWithValuesByTitleByFieldName
        // Filter valuesToExcludeByOriginalKey
        // Fabricated Filters
        // Default Filter
        // Filter keywords
        doc.markModified('fe_filters');
      

        doc.save(function (err, updatedDoc) {
            if (err) return next(err);

            data.doc = updatedDoc._doc;
            next(null, data);
        });

    });

}


/***************  Format Custom Field  ***************/
module.exports.getFormatCustomField = function (req, next) {
    var dataset_id = req.params.id;
    var field_name = req.params.field;
    if (!dataset_id) return next(new Error('Invalid parameter!'));


  

    var data = {
        id: dataset_id,
        field: field_name,
        firstRecords: req.session.uploadData_firstRecord,
        customMode: true
    };

    datasource_description.findById(dataset_id, function (err, doc) {
        if (err) return next(err);

        if (doc) {
            var _doc = doc._doc;
            data.doc = _doc;
            data.colNames = req.session.uploadData_columnNames;

            var finalizedFieldName = field_name.replace(/\./g, "_");

            if (!_doc.customFieldsToProcess || _doc.customFieldsToProcess.length == 0) return next(new Error('No custom field for ' + field_name));

            var customField =  _doc.customFieldsToProcess.find(function(element) {
                return element.fieldName == finalizedFieldName;
            });

            if (customField == null) return next(new Error('Invalid custom field for ' + field_name));

            data.customField = customField;

            if (!customField.fieldsToMergeIntoArray) return next(new Error('No corresponding fields to merge into array - ' + field_name));
        }
        next(null, data);
    });
}

module.exports.getFormatNewCustomField = function (req, next) {
    var dataset_id = req.params.id;
    if (!dataset_id) return next(new Error('Invalid parameter!'));

    var data = {
        id: dataset_id,
        customMode: true
    };

    datasource_description.findById(dataset_id, function (err, doc) {
        if (err) return next(err);

        if (doc) {
            data.doc = doc._doc;
            data.colNames = req.session.uploadData_columnNames;
        }
        next(null, data);
    });
}

module.exports.saveFormatCustomField = function (req, isNew, next) {
    var dataset_id = req.params.id;
    var name = req.body.name;
    var fieldsToMergeIntoArray = req.body.fieldsToMergeIntoArray;
    if (!dataset_id || !name || !fieldsToMergeIntoArray) return next(new Error('Invalid parameter!'));

    var data = {};
    var name = name.replace(/\./g, '_');


    datasource_description.findById(dataset_id, function (err, doc) {
        if (err) return next(err);

        if (!doc) return next(new Error('No description exists : ' + dataset_id));



        var customFieldsToProcess = doc._doc.customFieldsToProcess;
        if (!customFieldsToProcess) customFieldsToProcess = [];


        // Verify that the name is unique
        var duplicated = false;
        var indexDuplicated = customFieldsToProcess.length;
        for (var i = 0; i < customFieldsToProcess.length; i ++) {
            if (customFieldsToProcess[i].fieldName.toLowerCase() == name.toLowerCase()) {
                duplicated = true;
                indexDuplicated = i;
                break;
            }
        }

        if (isNew && duplicated) return next(new Error('Duplicated Field Name'));
        if (!isNew && !duplicated) return next(new Error('No field exists with ' + name));

        // Verify that the fieldType is "array"
        if (req.body.dataType == 'Array') {

            console.log('deleted : ' + indexDuplicated);

            var customField = {
                fieldName: name,
                fieldType: 'array',
                fieldsToMergeIntoArray: fieldsToMergeIntoArray
            };

            customFieldsToProcess.splice(indexDuplicated, 1, customField);

            doc.customFieldsToProcess = customFieldsToProcess;
            doc.markModified('customFieldsToProcess');

            doc.save(function(err, updatedDescription) {
                if (err) return next(err);
                req.flash('message', 'Save successfully');

                data.doc = updatedDescription._doc;
                data.columnIndex = req.session.uploadData_columnNames + updatedDescription._doc.customFieldsToProcess.length;
                data.customField = customField;

                next(null, data);
            });

        }
    });
}

module.exports.removeFormatCustomField = function (req, next) {
    var dataset_id = req.params.id;
    var name = req.body.name;
    if (!dataset_id || !name) return next(new Error('Invalid parameter!'));

    var data = {};
    var name = name.replace(/\./g, '_');

    datasource_description.findById(dataset_id, function (err, doc) {
        if (err) return next(err);

        if (!doc) return next(new Error('No description exists : ' + dataset_id));

        var customFieldsToProcess = doc._doc.customFieldsToProcess;
        if (!customFieldsToProcess) return next(new Error('Custom Fields does not exist'));

        // Verify that the name is unique
        var duplicated = false;
        var indexDuplicated = customFieldsToProcess.length;
        for (var i = 0; i < customFieldsToProcess.length; i ++) {
            if (customFieldsToProcess[i].fieldName.toLowerCase() == name.toLowerCase()) {
                duplicated = true;
                indexDuplicated = i;
                break;
            }
        }

        if (!duplicated) return next(new Error('No field exists with ' + name));

        // Verify that the fieldType is "array"
        if (req.body.dataType == 'Array') {

            console.log('deleted : ' + indexDuplicated);

            customFieldsToProcess.splice(indexDuplicated, 1);

            doc.customFieldsToProcess = customFieldsToProcess;
            doc.markModified('customFieldsToProcess');

            doc.save(function(err, updatedDescription) {
                if (err) return next(err);
                req.flash('message', 'Save successfully');

                data.doc = updatedDescription._doc;
                data.columnIndex = req.session.uploadData_columnNames + updatedDescription._doc.customFieldsToProcess.length;

                next(null, data);
            });

        }
    });
}


/***************  Format Views  ***************/
module.exports.getFormatViews = function (req, next) {
    var dataset_id = req.params.id;
    if (!dataset_id) return next(new Error('Invalid parameter!'));

    views.find({}, {name: 1, displayAs: 1, icon: 1}, function (err, allViews) {



        if (err) return next(new Error('error when getting views'));

        var data = {id: dataset_id, available_forViewTypes: allViews};
        datasource_description.findById(dataset_id, function (err, doc) {
            if (err) return next(err);
            if (doc) {
                data.doc = doc._doc;
            }
            next(null, data);
        });
    });
}

module.exports.getFormatView = function (req, next) {
    var dataset_id = req.params.id;
    var view_name = req.params.view;

    if (!dataset_id || !view_name) return next(new Error('Invalid parameter!'));

    var data = {id: dataset_id};
    data.available_forDuration = datatypes.available_forDuration();

    var batch = new Batch();
    batch.concurrency(1);

    batch.push(function(done) {
        datasource_description.findById(dataset_id, {uid:1,importRevision:1,title:1,fe_views:1,fe_designatedFields:1, fe_excludeFields:1,
            raw_rowObjects_coercionScheme:1, "customFieldsToProcess.fieldName":1,fe_displayTitleOverrides:1}, function (err, doc) {
            if (err) return done(new Error("Invalid dataset"));

            data.doc = doc;


            data.colNames = [];
            if (data.doc.customFieldsToProcess) {
                for (var i = 0; i < data.doc.customFieldsToProcess.length; i++) {
                    var custField = data.doc.customFieldsToProcess[i].fieldName;
                    data.colNames.push(custField);

                }
            }

            done();
        });
    });

    if (!req.session.uploadData_columnNames) {
        batch.push(function(done) {
            _loadDatasourceColumnsAndSampleRecords(req, data.doc, function (err, obj) {
                if (err) return done(err);
                done();
            });
        });
    }

    batch.push(function(done) {
        views.findOne({name: view_name}, function (err, foundView) {
            if (err) return next(new Error('error when getting specific view for customization'));

            data.view = foundView;
            done();
        });
    });

    batch.end(function(err) {
        data.colNames = data.colNames.concat(req.session.uploadData_columnNames);
        next(err, data);
    });
}

module.exports.saveFormatView = function (req, next) {

    var dataset_id = req.params.id;
    var field = req.params.view;
    if (!dataset_id || !field) return next(new Error('Invalid parameter!'));

    var batch = new Batch();
    batch.concurrency(1);

    var doc;
    var changedObj = {};

    if (!req.session.uploadData_columnNames) {
        batch.push(function(done) {
            _loadDatasourceColumnsAndSampleRecords(req, data.doc, function (err, obj) {
                if (err) return done(err);
                done();
            });
        });
    }


    batch.push(function(done) {

        datasource_description.findById(dataset_id,function(err,datasetDesc) {

            doc = datasetDesc;

            if (!doc.fe_views) doc.fe_views = {};
            if (!doc.fe_views.views) doc.fe_views.views = {};
            if (!doc.fe_views.views[field]) doc.fe_views.views[field] = {};
            if (req.body.default_view == true) {
                changedObj.default_view = field;
                doc.fe_views.default_view = field;
            } else {
                changedObj.default_view = "gallery";
            }

            doc.fe_views.views[field].visible = req.body.visible;
            changedObj.visible = req.body.visible


            var rest = _.omit(req.body,'default_view','visible');
            for (var attr in rest) {
                if (attr.indexOf('_value') == -1) {
                    if (attr.indexOf('_key') >= 0) {
                        var index = attr.indexOf('_key');
                        var value = attr.substring(0,index);


                        if (rest[value+"_value"] !== null && typeof rest[value + "_value"] !== 'undefined') {


                            var obj =_castSerializeElementToObject(rest[attr], rest[value + "_value"],false);
                            doc.fe_views.views[field][value] = obj;

                            delete rest[value + "_value"];

                        }
                        if (rest[value + "_value_separatedByComma"] !== null && typeof rest[value + "_value_separatedByComma"]
                            !== 'undefined') {
                            var obj =_castSerializeElementToObject(rest[attr], rest[value + "_value_separatedByComma"],true);

                            doc.fe_views.views[field][value] = obj;
                            delete rest[value + "_value_separatedByComma"];
                        }
                    } else {
                        if (attr.indexOf("_separatedByComma") >= 0) {
                             var arr = rest[attr].split(",");

                            attr = attr.substring(0,attr.indexOf("_separatedByComma"));
                            doc.fe_views.views[field][attr] = arr;

                        } else {
                             doc.fe_views.views[field][attr] = rest[attr];

                        }

                    }
                }

            }
            doc.markModified('fe_views');
            done();
        })

    })

    batch.end(function(err) {
        doc.save(function(err,updatedDoc) {
            if (err) return next(err);
            return next(null,changedObj);
        })
    })
}