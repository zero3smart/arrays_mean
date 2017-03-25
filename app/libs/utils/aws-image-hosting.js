var request = require('request');
var path = require('path');
var winston = require('winston');
var aws = require('aws-sdk');
var sharp = require('sharp');
var bucket = process.env.AWS_S3_BUCKET;
var s3 = new aws.S3();
var fs = require('fs');
var async = require('async');

function _uploadToS3(key,response,readFromFile,callback) {

    var payload = { 
        Bucket:bucket,
        Key: key,
        Body: response,
        ACL: 'public-read'
    };

    s3.upload(payload,function(err) {
        if (err) {
            winston.error("❌  AWS S3 write stream error");
            console.log(err);
        }
        return callback(err)
    })
}

function _appendKeyToBucket(key) {
    return 'https://' + bucket + '.s3.amazonaws.com/' + key;
}

function getImageAtUrl(remoteImageSourceURL,callback) {
    var options = {
        url :remoteImageSourceURL,
        encoding: null,
        timeout: 10000
    }
    request.get(options,function(err,response,data) {
        if ( (err && (err.code == 'ENOTFOUND' || err.code == 'ETIMEDOUT')) || response == null) {
            winston.info("❌  returning url as null, since Could not read the remote image " + remoteImageSourceURL + ": " , err);
            return callback(null,null);
        } else if (err) {
            return callback(err,null);
        }

        var imageFormat = response.headers['content-type'].split('/')[1];
        imageFormat = imageFormat.split(';')[0];

        if (typeof sharp.format[imageFormat] !== 'undefined') {
            return callback(null,data);
        } else {
            return callback(null,null);
        }
    })
}


function _signedUrlForPutObject(key,fileType,callback) {


    if (fileType.indexOf('svg') >= 0) { //fix space when uploading svg error
        fileType = 'image/svg+xml';
    }

    var params = {
        Bucket: bucket,
        Key: key,
        ACL: 'public-read',
        ContentType: fileType
    };

    s3.getSignedUrl('putObject',params,function(err,signedUrl) {
        
        callback(err,{putSignedUrl: signedUrl, publicUrl: _appendKeyToBucket(key)});
    })

}

module.exports.signedUrlForPutObject = _signedUrlForPutObject;



function _getAllIconsForTeam(teamSubdomain,callback) {
    s3.listObjects({
        Bucket: bucket,
        Prefix: teamSubdomain + '/assets/icon/',
        Marker: teamSubdomain + '/assets/icon/'
    },function(err,data) {
        if (err) { callback (err);} 
        else {
            var listOfUrls = [];
            var objects = data.Contents;

            for (var i = 0; i < objects.length; i++) {
                var objKey = objects[i].Key;

                var url = _appendKeyToBucket(objKey);

                listOfUrls.push(url);
            }
            callback(null,listOfUrls);
        }
    })

}


module.exports.getAllIconsForTeam = _getAllIconsForTeam;





function _proceedToStreamToHost(image,resize,folder,docPKey, callback)
{
    sharp(image)
    .metadata()
    .catch(function(err) {

    })
    .then(function(info) {

        if (!info) {
            winston.info("❌  returning url as null, since Could not read the remote image metadata");
            return callback();
        }
        var px = resize.size;
        var img;
        if (info.width < resize.size) {
            px = info.width;
        }
        if (resize.cropped) {
            img = sharp(image).resize(px,px)
        } else {
            img = sharp(image).resize(px)
        }
        img.toBuffer()
        .then(function(data) {
            var keyName = folder + resize.view + '/' + docPKey;
            _uploadToS3(keyName,data,false,callback);
        },function(err) {
            console.log("has err");
            console.log(err);
        })
    })
}



module.exports.hostImageLocatedAtRemoteURL = function(folder,remoteImageSourceURL, overwrite,destinationFilenameSansExt, callback)
{

    var recommendedSizes = [
        {"size": 763,"cropped": false, "view": "objectDetail"},
        {"size": 210,"cropped": false, "view": "gallery"},
        {"size": 60 ,"cropped": true, "view":  "timeline"}
    ]


    getImageAtUrl(remoteImageSourceURL,function(err,imageBuffer) {

        if (err || imageBuffer == null || !imageBuffer) {
            return callback(err);
        } else {
            async.each(recommendedSizes,function(size,cb) {
                if (overwrite == true) {
                    _proceedToStreamToHost(imageBuffer,size,folder,destinationFilenameSansExt,cb);
                } else {
                    var keyName = folder +  size.view + '/' + destinationFilenameSansExt;
                    var params = {
                        Bucket: bucket,
                        Key: keyName
                    };
                    try {
                        s3.headObject(params,function(err,data) {
                            if (data) {
                                winston.info("💬  File already uploaded and overwrite is false for object with pKey " + destinationFilenameSansExt);
                                cb();
                            } else {
                                console.log("head object err");
                            }
                        })
                    } catch (err) {

                        if (err.code == 'ENOTFOUND' || err.code == 'ETIMEDOUT') { 
                            _proceedToStreamToHost(imageBuffer,size,folder,destinationFilenameSansExt,cb);
                        } else {
                            console.log(err);
                            cb(err);
                        }
                    }
                }
            },callback)
        }
    })


}