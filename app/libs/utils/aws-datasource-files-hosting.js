var winston = require('winston');
var aws = require('aws-sdk');
var bucket = process.env.AWS_S3_BUCKET;
var fs = require('fs');
var s3 = new aws.S3();




function _uploadDataSource(filePath, newFilename, contentType,teamSubdomin, datasetUID, cb) {



    var file = fs.createReadStream(filePath);
    var params = {
        Bucket: bucket,
        Key:   teamSubdomin + "/datasets/" + datasetUID + "/datasources/" + newFilename,
        ContentType: contentType,
        Body: file,
        ACL: "private"
    };

    s3.upload(params,cb);
    
    // fs.readFile(filePath, function (err, data) {
    //     if (err) return cb(err);

    //     var params = {
    //         Bucket: bucket,
    //         Key:   teamSubdomin + "/datasets/" + datasetUID + "/datasources/" + newFilename,
    //         ContentType: contentType,
    //         Body: data,
    //         ACL: "private"
    //     };

    //     // console.log("uploading file -> ",params);

    //     s3.putObject(params, cb);
    // });
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
    var fileName = _fileNameToUpload(description)


    var key = description._team.subdomain +  '/datasets/' + description.uid + '/datasources/' + fileName;

    var param = {
        Bucket: bucket,
        Key:key
    }

    winston.info("🔁  Reading the datasource from S3 " + key);



    return s3.getObject(param)

}
module.exports.getDatasource = _getDatasource;


function _deleteDataset(description,cb) {
    var team_subdomain = description._team.subdomain;
    var param = {
        Bucket: bucket,
        Prefix: team_subdomain + '/datasets/' +  description.uid + "/"
    }
    s3.listObjects(param,function(err,data) {
        if (err) {
            return cb(err);
        }

        if (!data.Contents) {
            return cb();
        }

        if (data.Contents.length == 0) return cb();
        param = {Bucket: bucket};
        param.Delete = {Objects:[]};
        data.Contents.forEach(function(content) {
            param.Delete.Objects.push({Key: content.Key});
        })
        s3.deleteObjects(param,function(err,data) {
            if (err) return cb(err);
            if (!data.Contents) return cb();
            if (data.Contents.length == 1000) return _deleteDataset(description,cb);
            else {
                return cb();
            }
        })
    })
}




module.exports.deleteDataset = _deleteDataset;


function _deleteObject(key,cb) {
    var params = {
        Bucket : bucket,
        Key: key
    }
    s3.deleteObject(params,function(err,data) {
        if (err) return cb(err);
        return cb(null,data);
    })
}

module.exports.deleteObject = _deleteObject;