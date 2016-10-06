var aws = require('aws-sdk');

var datasource_description = require('../../models/datasource_description');

module.exports.index = function(req, next) {
    var data = {
        env: process.env,

        flash: req.flash('message'),
        
        user: req.user,
        pageTitle: "Dataset Settings"
    };

    next(null, data);
};

module.exports.signS3 = function(req, next) {
    var bucket = process.env.AWS_S3_BUCKET;
    var accessKey = process.env.AWS_ACCESS_KEY;
    var secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

    aws.config.update({
        accessKeyId: accessKey,
        secretAccessKey: secretAccessKey
    });

    const s3 = new aws.S3({params: {Bucket: bucket}});
    const fileName = decodeURIComponent(req.query['file-name']);
    const fileType = req.query['file-type'];
    const s3Params = {
        Bucket: bucket,
        Key: fileName,
        ContentType: fileType,
        ACL: 'publci-read'
    };

    s3.getSignedUrl('putObject', s3Params, function(err, data) {
        if (err) {
            return next (err);
        }
        const returnData = {
            signedRequest: data,
            url: 'https://' + bucket + '.s3.amazonaws.com/datasets/' + encodeURIComponent(fileName)
        };

        next(null, returnData);
    })
};
