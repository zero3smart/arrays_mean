var winston = require('winston');
var aws = require('aws-sdk');
var bucket = process.env.AWS_S3_BUCKET;
var fs = require('fs');
var s3 = new aws.S3();




function _uploadDataSource(filePath, newFilename, contentType,teamSubdomin, datasetId, cb) {

    var file = fs.createReadStream(filePath);
    var params = {
        Bucket: bucket,
        Key:   teamSubdomin + "/datasets/" + datasetId + "/datasources/" + newFilename,
        ContentType: contentType,
        Body: file,
        ACL: "private"
    };
    s3.upload(params,cb);
    
}
module.exports.uploadDataSource = _uploadDataSource;


function _copySampleDatasource(datasetToDuplicateId, fileName, datasetId, teamSubdomain, callback) {
    // this will be the demo team
    var params = {
        Bucket: bucket,
        CopySource: bucket + '/maitland/datasets/' + datasetToDuplicateId + '/datasources/' + fileName,
        Key: teamSubdomain + '/datasets/' + datasetId + '/datasources/' + fileName
    };
    s3.copyObject(params, function (err, data) {
        if(err) {
            console.log(err, err.stack)
            callback(err)
        } else {
            console.log("success")
        }
    })
}
module.exports.copySampleDatasource = _copySampleDatasource;


function _getDatasource(description) {
    var key =  description._team.subdomain +  '/datasets/' + description._id + '/datasources/' + description.fileName;
    if (description.schemaId) {
         key = description._team.subdomain +  '/datasets/' + description.schemaId + '/datasources/' + description.fileName;
    }
    
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
        Prefix: team_subdomain + '/datasets/' +  description.id + "/"
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


function _deleteTeam(subdomain,cb) {
    var param  = {
        Bucket: bucket,
        Prefix: subdomain + '/'
    }

    s3.listObjects(param,function(err,data) {
        if (err) return cb(err);
        if (!data.Contents) return cb();
        if (data.Contents.length == 0 ) return cb();
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

module.exports.deleteTeam = _deleteTeam;


function _deleteObject(key,cb) {
    var params = {
        Bucket : bucket,
        Key: key
    }
    console.log(params)
    s3.deleteObject(params,function(err,data) {
        console.log(err)
        console.log(data)
        if (err) return cb(err);
        return cb(null,data);
    })
}

module.exports.deleteObject = _deleteObject;