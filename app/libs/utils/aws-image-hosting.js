var request = require('request');
var path = require('path');
var winston = require('winston');
var aws = require('aws-sdk');
var sharp = require('sharp');
var bucket = process.env.AWS_S3_BUCKET;
var s3 = new aws.S3();
var fs = require('fs');

function _uploadToS3(key,response,readFromFile,callback) {
    var hostedFilePublicUrl = _appendKeyToBucket(key);
    if (readFromFile) {

    }
    var payload = { 
        Bucket:bucket,
        Key: key,
        Body: response,
        ACL: 'public-read'
    };

    s3.upload(payload,function(err) {
        if (err) {
            winston.error("❌  AWS S3 write stream error for url " + hostedFilePublicUrl + " and dest filename " + destinationFileName, " err: " , err);
        }
        return callback(err,hostedFilePublicUrl);

    })
}


function _signedUrlForPutObject(key,fileType,callback) {
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
        Prefix: teamSubdomain + '/assets/icons/',
        Marker: teamSubdomain + '/assets/icons/'
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






function _proceedToStreamToHost(resize,remoteImageSourceURL, bucketKey, callback)
{
    
        var options = {
            url :remoteImageSourceURL,
            encoding:null
        }

        request.get(options, function(err,response,body) {

            if ( (err && (err.code == 'ENOTFOUND' || err.code == 'ETIMEDOUT')) || response == null) {
                winston.info("❌  returning url as null, since Could not read the remote image " + remoteImageSourceURL + ": " , err);
                return callback(null,null);
            } else if (err) {
                return callback(err);
            }

            var imageFormat = response.headers['content-type'].split('/')[1];

            imageFormat = imageFormat.split(';')[0];

            if (typeof sharp.format[imageFormat] !== 'undefined') {
                if (typeof resize != 'undefined' && resize != null && !isNaN(resize)) {
                     sharp(body)
                    .resize(resize)
                    .toBuffer()
                    .then(function(data) {
                       _uploadToS3(bucketKey,data,false,callback)
                    },function(err) {
                        winston.info("❌  returning url as null, since Could not read the remote image " + remoteImageSourceURL + ": " , err);
                        return callback(null,null);

                    })
                } else {
                    if (body) {
                        _uploadToS3(bucketKey,body,false,callback)

                    }
                }
            } else {
                 winston.info("❌  returning url as null, since Could not read the remote image " + remoteImageSourceURL + ": " , err);
                return callback(null,null);

            }

            
        })


}
//
//
function _dotPlusExtnameSansQueryParamsFrom(url)
{
    var regex = /[#\\?]/g;
    var extname = path.extname(url);
    var endOfExt = extname.search(regex);
    if (endOfExt > -1) {
        extname = extname.substring(0, endOfExt);
    }
    
    return extname;
}


function _appendKeyToBucket(key) {
    return 'https://' + bucket + '.s3.amazonaws.com/' + key;
}


//
//
module.exports.hostImageLocatedAtRemoteURL = function(folder,resize,remoteImageSourceURL, destinationFilenameSansExt, hostingOpts, callback)
{
    //


    var dotPlusExtname = _dotPlusExtnameSansQueryParamsFrom(remoteImageSourceURL);
    var finalizedFilenameWithExt = destinationFilenameSansExt + dotPlusExtname; // construct after extracting ext from image src url
    //
    var hostedFilePublicUrl = _hostedPublicUrlFrom(folder,finalizedFilenameWithExt);
    //
    hostingOpts = hostingOpts || {};
    if (typeof hostingOpts.overwrite === 'undefined') {
        hostingOpts.overwrite = false;
    }
    if (hostingOpts.overwrite == true) { // overwrite if exists
        _proceedToStreamToHost(folder,resize,remoteImageSourceURL, finalizedFilenameWithExt, callback);
    } else {
        var params = {
            Bucket: bucket,
            Key:  folder + finalizedFilenameWithExt
        };
        try {
            s3.headObject(params, function (err, data) {
                if (!err) {
                    winston.info("💬  File already uploaded but overwrite:false for " + hostedFilePublicUrl);
                    return callback(null, hostedFilePublicUrl);
                }
                // if (err.code == 'NotFound')


                    _proceedToStreamToHost(resize,remoteImageSourceURL, folder + finalizedFilenameWithExt, callback);
            });
        } catch (err) {

            (err);

    
            if (err.code == 'ENOTFOUND' || err.code == 'ETIMEDOUT')
                _proceedToStreamToHost(resize,remoteImageSourceURL, folder + finalizedFilenameWithExt, callback);
        }
    }
}