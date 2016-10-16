var aws = require('aws-sdk');
var https = require('https');
var es = require('event-stream');
var parse = require('csv-parse');
var datasource_description = require('../../models/datasource_descriptions');

/***************  Index  ***************/
module.exports.index = function(req, next) {

    datasource_description.find({}, {_id: 1, title: 1, importRevision: 1}, function(err, datasets) {
        if (err) {
            return next(err);
        }

        var data = {
            env: process.env,

            flash: req.flash('message'),

            user: req.user,
            pageTitle: "Dataset Settings",
            docs: datasets
        };

        next(null, data);
    });
};

/***************  Upload/Source  ***************/
module.exports.getSource = function(req, next) {
    var data = {
        env: process.env,
        user: req.user,
        pageTitle: "Dataset Settings"
    };

    if (req.params.id) {
        datasource_description.findById(req.params.id, function(err, doc) {
            if (err) return next(err);

            if (doc) {
                data.sourceURL = doc.sourceURL;
                data.id = req.params.id;
            }

            next(null, data);
        });
    } else {
        next(null, data);
    }
};

module.exports.signS3 = function(req, next) {

    // uploading data to s3? can just use s3Service.uploadDataSource function


    var bucket = process.env.AWS_S3_BUCKET;
    var accessKey = process.env.AWS_ACCESS_KEY;
    var secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

    aws.config.update({
        accessKeyId: accessKey,
        secretAccessKey: secretAccessKey
    });

    const s3 = new aws.S3({params: {Bucket: bucket}});
    const fileName = decodeURIComponent(req.query['file-name']);
    const key = '/dataset/' + fileName;
    const fileType = req.query['file-type'];
    const s3Params = {
        Bucket: bucket,
        Key: key,
        ContentType: fileType,
        ACL: 'private'
    };

    s3.getSignedUrl('putObject', s3Params, function(err, data) {
        if (err) {
            return next (err);
        }
        const returnData = {
            signedRequest: data,
            // url: 'https://' + bucket + '.s3.amazonaws.com/' + key
        };

        next(null, returnData);
    })



};

module.exports.saveSource = function(req, next) {
    var data = {};

    if (req.params.id) {
        var query = {_id: req.params.id};
        datasource_description.findOneAndUpdate(query, req.body, {$upsert: true}, function(err, doc) {
            if (err) return next(err);

            data.id = req.params.id;

            next(null, data);
        });
    } else {
        var description = new datasource_description({sourceURL: req.body.sourceURL});
        description.save(function(err, doc) {
            if (err) return next(err);

            data.id = doc.id;

            next(null, data);
        });
    }
};


/***************  Format Data  ***************/
module.exports.getFormat = function(req, next) {
    var data = {
        env: process.env,
        user: req.user,
        pageTitle: "Dataset Settings"
    };


    if (req.params.id) {
        datasource_description.findById(req.params.id, function(err, doc) {
            if (err || !doc) return next(err);

            data.id = req.params.id;
            data.doc =doc;

            var countOfLines = 0;



            var request = https.get(doc.sourceURL, function(response) {
                response.pipe(es.split())
                    .pipe(es.mapSync(function (line) {
                        response.pause();

                        parse(line, {delimiter: ',', relax: true, skip_empty_lines: true}, function (err, output) {
                            countOfLines ++;

                            if (countOfLines == 1) {
                                data.colNames = output[0];
                                response.resume();
                            } else if (countOfLines == 2) {
                                data.firstRecord = output[0];
                                response.resume();
                            } else {
                                response.destroy();
                                if (countOfLines == 3) next(null, data);
                            }
                        });
                    }));
            }).on('error', function(err) {
                winston.error("❌  Could not read the source data " + request + ": " , err);
                return next(err);
            });
        });
    } else {
        next(new Error('ID should be provided.'));
    }
};

module.exports.saveFormat = function(req, next) {
    var data = {
        env: process.env,
        user: req.user,
        pageTitle: "Dataset Settings"
    };

    var sourceURL = req.body.sourceURL;

    if (req.params.id) {
        datasource_description.updateOne({_id: req.params.id}, {$set: {sourceURL: sourceURL}}, function(err) {
            if (err) return next(err);

            data.id = req.params.id;


        });
    } else {
        new datasource_description({sourceURL: sourceURL}).save();
    }

    next(null, data);
};

/***************  Settings  ***************/
module.exports.getSettings = function(req, next) {
    var data = {
        env: process.env,
        user: req.user,
        pageTitle: "Dataset Settings"
    };

    next(null, data);
};

module.exports.saveSettings = function(req, next) {
    var data = {
        env: process.env,
        user: req.user,
        pageTitle: "Dataset Settings"
    };

    var query = {_id: req.params.id};

    next(null, data);
};