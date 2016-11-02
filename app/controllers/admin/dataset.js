var winston = require('winston');
var aws = require('aws-sdk');
var fs = require('fs');
var es = require('event-stream');
var parse = require('csv-parse');
var Batch = require('batch');
var _ = require('lodash');

var datasource_description = require('../../models/descriptions');
var datasource_upload_service = require('../../../lib/datasource_process/aws-datasource-files-hosting');
var import_datatypes = require('../../datasources/utils/import_datatypes');
var imported_data_preparation = require('../../datasources/utils/imported_data_preparation')
var views = require('../../models/views');


/***************  Index  ***************/
module.exports.index = function (req, next) {
    datasource_description.find({schema_id:{$exists:false}}, {_id: 1, title: 1, importRevision: 1}, function (err, datasets) {
        if (err) {
            return next(err);
        }

        var data = {
            docs: datasets
        };

        next(null, data);
    });
};

/***************  Settings  ***************/
module.exports.getSettings = function (req, next) {
    var data = {};

    if (req.params.id) {
        datasource_description.findById(req.params.id, function (err, doc) {

            if (err) return next(err);

            if (doc) {
                data.doc = doc._doc;
            }

            next(null, data);
        });
    } else {
        next(null, data);
    }
};

module.exports.saveSettings = function (req, next) {

    var data = {};

    for (var field in req.body) {
        if (field.indexOf('[]') >= 0) {
            var arrayField = field.replace('[]','');

            if (typeof req.body[field] == 'string') {
                if (req.body[field] == "") {
                    req.body[arrayField] = []
                } else {
                    req.body[arrayField] = [req.body[field]];
                }

            } else if (Array.isArray(req.body[field])) {
                for (var i = 0; i < req.body[field].length; i++) {  /*splicing empty string in array */
                    if (req.body[field][i] == "") {
                        req.body[field].splice(i,1);
                    }
                }
                req.body[arrayField] = req.body[field];

            }
            delete req.body[field];
        }
    }

    req.body.fe_listed = req.body.fe_listed == 'true';

    if (req.params.id == 'new') {
        datasource_description.create(req.body, function(err, doc) {
            if (err) return next(err);

            data.id = doc.id;

            req.flash('message', 'Your settings are saved!');

            next(null, data);
        });
    } else {
        var query = {_id: req.params.id};
        datasource_description.findOneAndUpdate(query, req.body, {$upsert: true}, function (err, doc) {
            if (err) return next(err);

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

            next(null, data);
        });
    } else {
        next(null, data);
    }
};

module.exports.saveSource = function (req, next) {

    var description;

    var batch = new Batch;
    batch.concurrency(1);

    batch.push(function(done) {
        datasource_description.findById(req.params.id)
            .exec(function(err, doc) {
            if (err) return done(err);

            description = doc


            done();
        })
    });

    _.forEach(req.files, function(file) {
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
            } else
                return done(new Error('Invalid File Format'));

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


        batch.push(function(done) {
        
            if (!description.uid)
                description.uid = imported_data_preparation.DataSourceUIDFromTitle(description.title);
            var newFileName = datasource_upload_service.fileNameToUpload(description);
            datasource_upload_service.uploadDataSource(file.path, newFileName, file.mimetype, done);
        });

        batch.push(function (done) {
            var query = {_id: req.params.id};
            description.save(function(err, updatedDescription) {
                console.log(err);

                if (err) return done(err);

                req.flash('message', 'Uploaded successfully');
                done();
            });
        });
    });

    batch.end(function (err) {
        if (err) {
            req.flash('message', err.message);
            // return next();
        }

        next();
    });
};


module.exports.loadDatasourceColumnsAndSampleRecords = function(req,description,next) {

    var obj = {};


    var countOfLines = 0;
    var cachedLines = '';

    var delimiter;

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


/***************  Format Data  ***************/
module.exports.getFormatData = function (req, next) {

    if (req.params.id) {
        var data = {};

        datasource_description.findById(req.params.id, function (err, doc) {
            if (err || !doc) return next(err);

            var description = doc
            data.doc = description;

            if (req.session.uploadData_firstRecord == null || req.session.uploadData_columnNames == null ) {
                // var countOfLines = 0;
                // var cachedLines = '';

                // var delimiter;
                if (description.format == 'CSV') {
                    delimiter = ',';
                } else if (description.format == 'TSV') {
                    delimiter = '\t';
                } else
                    return next(new Error('Invalid File Format'));


                module.exports.loadDatasourceColumnsAndSampleRecords(req,description,function(err,obj) {
                    if (!err) {
                        data.colNames = obj.colNames;
                        data.firstRecord = obj.firstRecord;
                        return next(null,data);
                    } else {
                        return next(err);

                    }
                });

            } else {
                data.colNames = req.session.uploadData_columnNames;
                data.firstRecord = req.session.uploadData_firstRecord;
                next(null,data);
            }            
        });

    }
};

module.exports.saveFormatData = function (req, next) {
    var data = {};

    var sourceURL = req.body.sourceURL;

    if (req.params.id) {
        var updateObject = {fn_new_rowPrimaryKeyFromRowObject: req.body.fn_new_rowPrimaryKeyFromRowObject};
        datasource_description.findOneAndUpdate({_id: req.params.id}, updateObject, {$upsert: true}, function (err, doc) {
            if (err) return next(err);

            // TODO: Import datasource

            if (doc != null) {
                data.doc = doc._doc;
            }

            next(null, data);
        });
    }
};

/***************  Format Field  ***************/
module.exports.getFormatField = function(req, next) {
    var dataset_id = req.params.id;
    var field_name = req.params.field;
    if (!dataset_id || !field_name) return next(new Error('Invalid parameter!'));

    var data = {
        id: dataset_id,
        field:field_name,
        available_forFieldDataType_coercions: import_datatypes.available_forFieldDataType_coercions()
    };

    datasource_description.findById(dataset_id, function(err, doc) {
        if (err) return next(err);

        if (doc) {
            data.doc = doc._doc;
        }
        next(null, data);
    });
}

module.exports.saveFormatField = function(req, next) {
    var dataset_id = req.params.id;
    var field = req.params.field;

    if (!dataset_id || !field) return next(new Error('Invalid parameter!'));

    var data = {};
    field = field.replace(/\./g, "_");

    datasource_description.findById(dataset_id, function(err, doc) {
        if (err) return next(err);

        var dataTypeCoercionChanged = false;

        // Data Type Coercion
        if (!doc.raw_rowObjects_coercionScheme) doc.raw_rowObjects_coercionScheme = {};
        if (doc.raw_rowObjects_coercionScheme[field]) {
            schemaChanged = true;
            doc.raw_rowObjects_coercionScheme[field] = {
                operation: req.body.dataType,
                format: req.body.dataFormat,
                outputFormat: req.body.dataOutputFormat
            };
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
        if (req.body.titleOverride != '') {
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
        if (req.body.designatedField != '') {
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

        // Filter commaSeparatedAsIndividual
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
        // Filter keywordFilters
        doc.markModified('fe_filters');

        doc.save(function(err, updatedDoc) {
            if (err) return next(err);

            data.doc = updatedDoc._doc;
            data.dataTypeCoercionChanged = dataTypeCoercionChanged;
            next(null, data);
        });
    });

}

/***************  Add Custom Field  ***************/
module.exports.getAddCustomField = function(req, next) {
    var dataset_id = req.params.id;
    if (!dataset_id) return next(new Error('Invalid parameter!'));

    var data = {
        id: dataset_id
    };

    datasource_description.findById(dataset_id, function(err, doc) {
        if (err) return next(err);

        if (doc) {
            data.doc = doc._doc;
        }
        next(null, data);
    });
}

/***************  Format Views  ***************/
module.exports.getFormatViews = function (req, next) {


    var dataset_id = req.params.id;
    if (!dataset_id ) return next(new Error('Invalid parameter!'));

    views.find({},{name:1,displayAs:1,icon:1},function(err,allViews) {
        if (err) return next(new Error('error when getting views'));
        var data = {id: dataset_id,available_forViewTypes: allViews};
        datasource_description.findById(dataset_id, function(err, doc) {
            if (err) return next(err);
            if (doc) {
                data.doc = doc._doc;
            }
            next(null, data);
        });


    })

}


module.exports.getFormatView = function(req,next) {


    var dataset_id = req.params.id;
    var view_name = req.params.view;
    var data = {id:dataset_id};
    data.available_forDateFormat = import_datatypes.available_forDateFormat();

    if (!dataset_id || !view_name) return next(new Error('Invalid parameter!'));

    if (!req.session.uploadData_columnNames) {
        datasource_description.findById(dataset_id,function(err,doc) {
            module.exports.loadDatasourceColumnsAndSampleRecords(req,doc,function(err,obj) {
                if (err) return next(err);
                data.colNames = req.session.uploadData_columnNames;
                views.findOne({name: view_name},function(err,foundView) {
                    if (err) return next(new Error('error when getting specific view for customization'));
                    data.view = foundView;
                    datasource_description.findById(dataset_id, function(err, doc) {
                        if (err) return next(err);
                        if (doc) {
                            data.doc = doc._doc;
                        }
                        return next(null, data);
                    });
                })

            })
        })
      
    } else {
        data.colNames =  req.session.uploadData_columnNames;

        views.findOne({name: view_name},function(err,foundView) {
            if (err) return next(new Error('error when getting specific view for customization'));
            data.view = foundView;
            datasource_description.findById(dataset_id, function(err, doc) {
                if (err) return next(err);
                if (doc) {
                    data.doc = doc._doc;
                }
                return next(null, data);
            });
        })
    }
}

module.exports.saveFormatViews = function(req, next) {
    var data = {};

    if (req.params.id) {
    }

    next(null, data);
}