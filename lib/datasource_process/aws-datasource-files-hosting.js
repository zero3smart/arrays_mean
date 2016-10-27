var aws = require('aws-sdk');
var bucket = process.env.AWS_S3_BUCKET;
var fs = require('fs');
var s3 = new aws.S3();

module.exports = {
	uploadDataSource: function(filePath, newFilename, contentType, cb) {
		fs.readFile(filePath, function(err, data){
			if (err) return cb(err);

			var params = {
				Bucket: bucket,
				Key: "datasources/" + newFilename,
				ContentType: contentType,
				Body: data,
				ACL: "private"
			}

			s3.putObject(params, cb);
		});
	},

	getDatasource : function(description, cb) {
		var fileName = description.uid;
		if (description.dataset_uid) fileName += '__' + description.dataset_uid;

		var param = {
			Bucket:bucket,
			Key: "datasources/" + fileName
		}

		return s3.getObject(param)

	}
}