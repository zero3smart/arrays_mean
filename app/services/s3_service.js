var aws = require('aws-sdk');
var bucket = process.env.AWS_S3_BUCKET;
var s3 = new aws.S3();

module.exports = {
	uploadDataSource: function(body,cb) {
		var params = {
			Bucket: bucket,
			Key: body.key,
			ContentType: body.fileType,
			ACL: "private",
			ContentDisposition: "filename='" + body.filename
		}
		s3.putObject(params,function(err,data) {
			if (err) {
				console.log(err);
			} else {
				console.log(data);
				cb(data);
			}
		})
	},
	getDatasource : function(key,cb) {
		var param = {
			Bucket:bucket,
			Key: key
		}

		return s3.getObject(param)

	}








}