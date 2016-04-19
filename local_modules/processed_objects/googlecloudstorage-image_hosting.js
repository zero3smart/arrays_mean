//
//
var http = require('http');
var path = require('path');
var gcloud = require('gcloud');
var winston = require('winston');
//
//
var cloudStorageBucket = process.env.GCLOUD_IMGS_BUCKET;
var gcloudConfig =
{
    projectId: process.env.GCLOUD_PROJECT_ID
};
var storage = gcloud.storage(gcloudConfig);
var bucket = storage.bucket(cloudStorageBucket);
//
//
module.exports.hostImageLocatedAtRemoteURL = function(remoteImageSourceURL, destinationFilenameSansExt, hostingOpts, callback)
{ // callback: (err, hostedURL) -> Void
    //
    var dotPlusExtname = dotPlusExtnameSansQueryParamsFrom(remoteImageSourceURL);
    var finalizedFilenameWithExt = destinationFilenameSansExt + dotPlusExtname; // construct after extracting ext from image src url
    //  
    var hostedFilePublicUrl = hostedPublicUrlFrom(finalizedFilenameWithExt);
    //
    var bucket_file = bucket.file(finalizedFilenameWithExt);
    //
    hostingOpts = hostingOpts || {};
    if (typeof hostingOpts.overwrite === 'undefined') {
        hostingOpts.overwrite = false;
    }
    if (hostingOpts.overwrite == true) { // overwrite if exists
        proceedToStreamToHost();
    } else {
        bucket_file.exists(function(err, exists)
        {
            if (err) {
                winston.error("❌  Error during file.exists ", finalizedFilenameWithExt, err);
                callback(err, null);
                
                return;
            }
            if (exists == true) {
                winston.info("💬  File already uploaded but overwrite:false for " + hostedFilePublicUrl);
                callback(null, hostedFilePublicUrl);
                
                return;
            }
            proceedToStreamToHost();
        });
    }
    function proceedToStreamToHost()
    {
        winston.info("📡  Streaming " + remoteImageSourceURL + " -> " + hostedFilePublicUrl);
        var writeStreamOptions =
        {
            validation: false, // https://github.com/GoogleCloudPlatform/gcloud-node/issues/889
            resumable: false // https://github.com/GoogleCloudPlatform/gcloud-node/issues/470
        }
        var bucket_writeStream = bucket_file.createWriteStream(writeStreamOptions); 
        bucket_writeStream.on('finish', function() 
        {
            proceedToCallBack();
        });
        bucket_writeStream.on('error', function(err)
        {
            winston.error("❌  Google Cloud Storage write stream error for remote img src url " + remoteImageSourceURL + " and dest filename " + finalizedFilenameWithExt, " err: " , err)
            proceedToCallBack(err);
        });
        //
        var request = http.get(remoteImageSourceURL, function(response) 
        {
            response.pipe(bucket_writeStream);
        });
    }
    function proceedToCallBack(err)
    {
        callback(err, hostedFilePublicUrl);
    }
}
//
//
function dotPlusExtnameSansQueryParamsFrom(url)
{
    var regex = /[#\\?]/g;
    var extname = path.extname(url);
    var endOfExt = extname.search(regex);
    if (endOfExt > -1) {
        extname = extname.substring(0, endOfExt);
    }
    
    return extname;
}
//
//
function hostedPublicUrlFrom(filename) 
{
    return 'https://storage.googleapis.com/' + cloudStorageBucket + '/' + filename;
}