
var jdbc = require('jdbc');
var winston = require('winston');
var jinst = require('jdbc/lib/jinst');
var async = require('async');
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

            conn.createStatement(function(err,statement) {
                console.log(tableName);
                statement.executeQuery("SELECT * FROM " + tableName,function(err,results) {
                    console.log(results);
                    results.toObjArray(function(err,obj) {
                        console.log(obj);
                    })
                })
            })


            // async.waterfall([
            //     function(callback) {
            //         conn.createStatement(function(err,statement) {
            //             if (err) callback(err);
            //             else {
            //                 callback(null,statement);
            //             }
            //         })
            //     },
            //     function(statement,callback) {
            //         statement.executeQuery("SELECT TOP 1 FROM " + tableName,function(err,results) {
            //             if (err) callback(err);
            //             else {
            //                 callback(null,results);
            //             }
            //         })
            //     },
            //     function(results,callback) {
            //         results.toObjArray(function(err,obj) {
            //             if (err) callback(err);
            //             else {
            //                 callback(null,obj);
            //             }
            //         })
            //     }
            // ],function(err,jsonData) {
            //     if (err) {
            //         winston.error("Error reading remote data columns and records: %s",err);
            //         return fn(err);
            //     }
            //     return fn(null,jsonData);
            // })

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