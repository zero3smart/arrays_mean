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

            var row = doc._doc;
            data.doc = row;

            var countOfLines = 0;
            var cachedLines = '';

            var delimiter;
            if (row.format == 'CSV') {
                delimiter = ',';
            } else if (row.format == 'TSV') {
                delimiter = '\t';
            } else
                return next(new Error('Invalid File Format'));

            var readStream = datasource_upload_service.getDatasource(row.uid).createReadStream()
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
        datasource_description.updateOne({_id: req.params.id}, {$set: {sourceURL: sourceURL}}, function (err) {
            if (err) return next(err);

            data.id = req.params.id;


        });
    } else {
        new datasource_description({sourceURL: sourceURL}).save();
    }

    next(null, data);
};

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