var aws = require('aws-sdk');
var bucket = process.env.AWS_S3_BUCKET;
var s3 = new aws.S3();

module.exports = {
	uploadDataSource: function(filename,cb) {
		var params = {
			Bucket: bucket,
			Key: "datasources/" + filename,
			ContentType: body.fileType,
			ACL: "private",
			ContentDisposition: "filename='" + filename
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
	getDatasource : function(filename,cb) {
		var param = {
			Bucket:bucket,
			Key: "datasources/" + filename
		}

		return s3.getObject(param)

	}








}