
var jdbc = require('jdbc');
var winston = require('winston');
var jinst = require('jdbc/lib/jinst');
var Batch = require('batch');
var path = require('path');
var driverPath = path.join(__dirname,'/../drivers/');



if (!jinst.isJvmCreated()) {
    jinst.addOption("-Xrs");
    jinst.setupClasspath([ driverPath + 'commons-codec-1.3.jar',
        driverPath + 'commons-logging-1.1.1.jar',
        driverPath + 'HiveJDBC41.jar',
        driverPath + 'hive_metastore.jar',
        driverPath + 'hive_service.jar',
        driverPath + 'httpclient-4.1.3.jar',
        driverPath + 'httpcore-4.1.3.jar',
        driverPath + 'libfb303-0.9.0.jar',
        driverPath + 'libthrift-0.9.0.jar',
        driverPath + 'log4j-1.2.14.jar',
        driverPath + 'ql.jar',
        driverPath + 'slf4j-api-1.5.11.jar',
        driverPath + 'slf4j-log4j12-1.5.11.jar',
        driverPath + 'TCLIServiceClient.jar',
        driverPath + 'zookeeper-3.4.6.jar'
    ]);
}

var db;




function _readColumnsAndSample(tableName,fn) {
    db.reserve(function(err,connObj) {

        if (connObj) {

            console.log("Using connection: " + connObj. uuid);
            var conn = connObj.conn;

            var jsonData;

            var batch = new Batch();
            batch.concurrency(1);

            batch.push(function(done) {

                conn.createStatement(function(err,statement) {
                    if (err) done(err);

                    batch.push(function(done) {
                        statement.executeQuery("SELECT TOP 1 FROM " + tableName,function(err,results) {
                            if (err) done(err);
                            batch.push(function(done) {
                                results.toObjArray(function(err,obj) {
                                    if (err) done(err);
                                    jsonData = obj;
                                    console.log(obj);
                                    done();

                                })
                            })
                        })
                        done();
                    })
                })
            })

           batch.end(function(err) {
                if (err) {
                    winston.error("Error reading remote data columns and records: %s",err);
                    fn(err);
                }
                else fn(null,jsonData);
           })
        }
    })
}

module.exports.initConnection = function(req,res) {

    if (db) {
        winston.info("init connection: connection already made.");
        _readColumnsAndSample(req.body.tableName,function(err,data) {
            if (err) return res.status(500).send(err);
            else {
                console.log("successfully read columns and sample, data: %s",
                    JSON.stringify(data));
                return res.json(data);
            }
        })
    } else {
        winston.info("ready to init a new connection.");

        var config = {

            url: req.body.url
        };

   
        var JDBC = new jdbc(config)

        JDBC.initialize(function(err) {
            if (err) {
                console.log(err);
                winston.error("Cannot initialize JDBC object");
                return res.status(500).send(err);
            }
            db = JDBC;
            _readColumnsAndSample(req.body.tableName,function(err,data) {
                if (err) return res.status(500).send(err);
                else {
                    console.log("successfully read columns and sample, data: %s",
                        JSON.stringify(data));
                    return res.json(data);
                }

            })
        })
    }
}