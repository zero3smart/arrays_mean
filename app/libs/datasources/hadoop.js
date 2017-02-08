
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

            async.waterfall([
                function(callback) {
                    conn.createStatement(function(err,statement) {
                        if (err) callback(err);
                        else {
                            callback(null,statement);
                        }
                    })
                },
                function(statement,callback) {
                    statement.executeQuery("SELECT * FROM " + tableName + " LIMIT 1",function(err,results) {
                        if (err) callback(err);
                        else {
                            callback(null,results);
                        }
                    })
                },
                function(results,callback) {
                    results.toObjArray(function(err,obj) {
                        if (err) callback(err);
                        else {
                            callback(null,obj);
                        }
                    })
                },
                function(array,callback) {
                    var data = [];
                    var firstRecord = array[0];
                    for (var col in firstRecord) {
                        var column = col.split(".")[1];
                        data.push({name: column,sample:firstRecord[col]});
                    }
                    callback(null,data);
                }
            ],function(err,arrayOfCols) {
                var errorFromFuncions = err;
                db.release(connObj,function(err) {
                    if (err || errorFromFuncions) {
                        winston.error("Error reading remote data columns and records: %s",err);
                        return fn(err);
                    } else {
                        console.log("return data and release connection:", connObj. uuid);
                        return fn(null,arrayOfCols);
                    }
                })
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

        var jsonData = [{name:'abc',sample:'1'},{name:'colms2',sample:"what is this???"},{name:"hello",sample:"hello"}];
        req.session.columns[req.params.id] = jsonData;

        return res.status(200).json({message: 'ok'});

        // var JDBC = new jdbc(config)

        // JDBC.initialize(function(err) {
        //     if (err) {
        //         winston.error("Cannot initialize JDBC object");
        //         return res.status(500).send(JSON.stringify(err));
        //     }
        //     db = JDBC;
        //     _readColumnsAndSample(req.body.tableName,function(err,data) {
        //         if (err) return res.status(500).json(err);
        //         else {
        //             console.log("successfully read columns and sample, data: %s",
        //                 JSON.stringify(data));
        //             if (!req.session.columns) req.session.columns = {};
        //             req.session.columns[req.params.id] = data;
        //             return res.json(data);
        //         }

        //     })
        // })
    }
}


module.exports.readData = function(query,fn) {


    var jsonData = [{amgid:'abc',sample:'1'},{amgid:'colms2',sample:"what is this???"},{amgid:"hello",sample:"hello"}];

    return fn(null,jsonData);





    //  db.reserve(function(err,connObj) {

    //     if (connObj) {

    //         console.log("Using connection: " + connObj. uuid);
    //         var conn = connObj.conn;

    //         async.waterfall([
    //             function(callback) {
    //                 conn.createStatement(function(err,statement) {
    //                     if (err) callback(err);
    //                     else {
    //                         callback(null,statement);
    //                     }
    //                 })
    //             },
    //             function(statement,callback) {
    //                 statement.executeQuery(query,function(err,results) {
    //                     if (err) callback(err);
    //                     else {
    //                         callback(null,results);
    //                     }
    //                 })
    //             },
    //             function(results,callback) {
    //                 results.toObjArray(function(err,obj) {
    //                     if (err) callback(err);
    //                     else {
    //                         callback(null,obj);
    //                     }
    //                 })
    //             }
    //         ],function(err,arrayOfData) {
    //             var errorFromFuncions = err;
    //             db.release(connObj,function(err) {
    //                 if (err || errorFromFuncions) {
    //                     winston.error("Error reading remote data columns and records: %s",err);
    //                     return fn(err);
    //                 } else {
    //                     return fn(null,arrayOfData);
    //                 }
    //             })
    //         })
    //     }
    // })
}