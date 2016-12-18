var winston = require('winston');
var aws = require('aws-sdk');
var bucket = process.env.AWS_S3_BUCKET;
var fs = require('fs');
var s3 = new aws.S3();




function _uploadDataSource(filePath, newFilename, contentType,teamSubdomin, datasetUID, cb) {
    fs.readFile(filePath, function (err, data) {
        if (err) return cb(err);

        var params = {
            Bucket: bucket,
            Key:   teamSubdomin + "/datasets/" + datasetUID + "/datasources/" + newFilename,
            ContentType: contentType,
            Body: data,
            ACL: "private"
        };

        s3.putObject(params, cb);
    });
}
module.exports.uploadDataSource = _uploadDataSource;




function _fileNameToUpload(datasourceDescription) {
    
    var fileName = datasourceDescription.uid;
    if (datasourceDescription.dataset_uid)
        fileName += '__' + datasourceDescription.dataset_uid;

    fileName += '_v' + datasourceDescription.importRevision;

    return fileName;
}
module.exports.fileNameToUpload = _fileNameToUpload;

function _getDatasource(description) {
    var fileName = _fileNameToUpload(description);
    var key = description._team.subdomain +  '/datasets/' + description.uid + '/datasources/' + fileName;

    var param = {
        Bucket: bucket,
        Key:key
    }

    winston.info("🔁  Reading the datasource from S3 " + key);

    return s3.getObject(param)

}
module.exports.getDatasource = _getDatasource;