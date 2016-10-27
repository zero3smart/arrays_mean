var winston = require('winston');
var aws = require('aws-sdk');
var fs = require('fs');
var es = require('event-stream');
var parse = require('csv-parse');
var Batch = require('batch');
var uuid = require('node-uuid');
var _ = require('lodash');

var datasource_description = require('../../models/descriptions');
var datasource_upload_service = require('../../../lib/datasource_process/aws-datasource-files-hosting');
var import_datatypes = require('../../datasources/utils/import_datatypes');

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
    var uid, format;

    var batch = new Batch;
    batch.concurrency(1);

    _.forEach(req.files, function(file) {
        batch.push(function (done) {
            // Verify that the file is readable & in the valid format.
            var countOfLines = 0;
            var cachedLines = '';

            var delimiter;
            if (file.mimetype == 'text/csv') {
                delimiter = ',';
                format = 'CSV';
            } else if (file.mimetype == 'text/tab-separated-values') {
                delimiter = '\t';
                format = 'TSV';
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
            uid = uuid.v4();

            datasource_upload_service.uploadDataSource(file.path, uid, file.mimetype, done);
        });

        batch.push(function (done) {
            var query = {_id: req.params.id};

            datasource_description.findOneAndUpdate(query, {uid: uid, format: format}, {$upsert: true}, function (err) {
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


/***************  Format Data  ***************/
module.exports.getFormatData = function (req, next) {
    if (req.params.id) {
        var data = {};

        datasource_description.findById(req.params.id, function (err, doc) {
            if (err || !doc) return next(err);

            var desciption = doc._doc;
            data.doc = desciption;

            var countOfLines = 0;
            var cachedLines = '';

            var delimiter;
            if (desciption.format == 'CSV') {
                delimiter = ',';
            } else if (desciption.format == 'TSV') {
                delimiter = '\t';
            } else
                return next(new Error('Invalid File Format'));

            var readStream = datasource_upload_service.getDatasource(desciption).createReadStream()
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
                                return done(new Error('Invalid File'));
                            }

                            cachedLines = '';
                            countOfLines++;

                            if (countOfLines == 1) {
                                data.colNames = output[0];
                                readStream.resume();
                            } else if (countOfLines == 2) {
                                data.firstRecord = output[0];
                                readStream.resume();
                            } else {
                                readStream.destroy();
                                if (countOfLines == 3) next(null, data);
                            }
                        });
                }));
            }
        );
    }
};

module.exports.saveFormatData = function (req, next) {
    var data = {};

    var sourceURL = req.body.sourceURL;

    if (req.params.id) {
        var updateObject = {fn_new_rowPrimaryKeyFromRowObject: req.body.fn_new_rowPrimaryKeyFromRowObject};
        datasource_description.findOneAndUpdate({_id: req.params.id}, updateObject, {$upsert: true}, function (err, doc) {
            if (err) return next(err);

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

    datasource_description.findById(dataset_id, function(err, doc) {
        if (err) return next(err);

        // Data Type Coercion
        if (!doc.raw_rowObjects_coercionScheme) doc.raw_rowObjects_coercionScheme = {};
        doc.raw_rowObjects_coercionScheme[field] = {operation: req.body.dataType, format: req.body.dataFormat, outputFormat: req.body.dataOutputFormat};

        // Exclude
        if (!doc.fe_excludeFields) doc.fe_excludeFields = [];
        var index = doc.fe_excludeFields.indexOf(field);
        if (req.body.exclude == 'true' && index == -1) {
            doc.fe_excludeFields.push(field);
        } else if (req.body.exclude != 'true' && index != -1) {
            doc.fe_excludeFields.splice(index, 1);
        }

        // Title Override
        if (!doc.fe_displayTitleOverrides) doc.fe_displayTitleOverrides = {};
        if (req.body.titleOverride != '')
            doc.fe_displayTitleOverrides[field] = req.body.titleOverride;

        // Display Order
        if (!doc.fe_fieldDisplayOrder) doc.fe_fieldDisplayOrder = {};
        console.log(req.body.displayOrder);
        if (req.body.displayOrder != 0)
            doc.fe_fieldDisplayOrder[field] = req.body.displayOrder;

        // Designated Field
        if (!doc.fe_fieldsDesignatedFields) doc.fe_fieldsDesignatedFields = {};
        if (req.body.designatedField != '') {
            doc.fe_fieldsDesignatedFields[req.body.designatedField] = field;
        }

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

        doc.save(function(err, updatedDoc) {
            if (err) return next(err);

            data.doc = updatedDoc;
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
    var data = {};

    if (req.params.id) {
    }

    next(null, data);
}

module.exports.saveFormatViews = function(req, next) {
    var data = {};

    if (req.params.id) {
    }

    next(null, data);
}