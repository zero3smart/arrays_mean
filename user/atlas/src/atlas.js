
var jdbc = require('jdbc');
var winston = require('winston');
var jinst = require('jdbc/lib/jinst');
var Batch = require('batch');


if (!jinst.isJvmCreated()) {
    jinst.addOption("-Xrs");
    jinst.setupClasspath(['../drivers/commons-codec-1.3.jar',
        '../drivers/commons-logging-1.1.1.jar',
        '../drivers/HiveJDBC41.jar',
        '../drivers/hive_metastore.jar',
        '../drivers/hive_service.jar',
        '../drivers/httpclient-4.1.3.jar',
        '../drivers/httpcore-4.1.3.jar',
        '../drviers/libfb303-0.9.0.jar',
        '../drivers/libthrift-0.9.0.jar',
        '../drivers/log4j-1.2.14.jar',
        '../drivers/ql.jar',
        '../drivers/slf4j-api-1.5.11.jar',
        '../drivers/slf4j-log4j12-1.5.11.jar',
        '../drivers/TCLIServiceClient.jar',
        '../drivers/zookeeper-3.4.6.jar'
    ]);
}

var config = {

    url: 'jdbc:hive2://uslv-dhad-edg1a.amgen.com:10000/edl_training;AuthMech=1;KrbHostFQDN=uslv-dhad-edg1a.amgen.com;KrbRealm=HADOOP-DEV.AMGEN.COM;KrbServiceName=hive'
};



module.exports.BindData = function(req,callback) {

	var JDBC = new jdbc(config);

	JDBC.initialize(function(err) {
		winston.error("Error occured when initializing JDBC object");
	    if (err) return callback(err);
	});

	JDBC.reserve(function(err,connObj) {
		if (connObj) {
			winston.info("Using connection: " + connObj.uuid);
			var conn = connObj.conn;

			var batch = new Batch();
			batch.concurrency(1);

			var json;
			batch.push(function(done) {
				conn.createStatement(function(err,statement) {
					if (err) done(err);
					batch.push(function(done) {
						statement.toObjArray(function(err,data) {
							if (err) done(err);
							json = data;
							done();
						})
					})
				})
			})

			batch.push(function(done) {
				JDBC.release(connObj,done);
			})

			batch.end(function(err) {
				if (err) {
					winston.error("Error while querying the database");
					return callback(err);
				}
				return callback(null,json);

			})

		} else {
			winston.error("No Connection Object reserved");
			var error = new Error("No Connection made");
			return callback(error);
		}
	})
}



