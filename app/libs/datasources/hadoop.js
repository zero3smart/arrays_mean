
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
                        data.push({name: col,sample:firstRecord[col]});
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

module.exports.readColumnsAndSample = function(body,tableName,fn) {


    if (db) {


        _readColumnsAndSample(tableName,fn);

    } else {

        _initConnection(body.url,function(err) {
            if (err) fn(err);
             _readColumnsAndSample(tableName,fn);

        })

    }
}


function _readAllTables(fn) {

    db.reserve(function(err,connObj) {

        if (connObj) {

            console.log("Using connection: " + connObj. uuid + "for reading tables in this schema");
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
                    statement.executeQuery("SHOW TABLES",function(err,results) {
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
                }
            ],function(err,arrayOfTables) {
                var errorFromFuncions = err;
                db.release(connObj,function(err) {
                    if (err || errorFromFuncions) {
                        winston.error("Error reading tables from connection");
                        console.log(err);
                        console.log(errorFromFuncions);
                        return fn(err);
                    } else {
                        console.log("return data of tables and release connection:", connObj. uuid);
                        return fn(null,arrayOfTables);
                    }
                })
            })
        }
    })

}

function _initConnection(url,callback) {
    winston.info("ready to init a new connection.");
    var config = {
        url: url,
        minpoolsize:5,
        maxpoolsize:10
    }
    var JDBC = new jdbc(config);
    JDBC.initialize(function(err) {
        if (err) {
            console.log("Error from initializing connection :: ");
            console.log(err);
            callback(err);
        }
        else {
            db = JDBC;
            callback(null);
        }
    })

}

module.exports.initConnection = function(body,callback) {




    if (db) {
        winston.info("init connection: connection already made.");

        _readAllTables(function(err,data) {
            if (err) callback(err);
            else {
               
                console.log("successfully read tables, data %s", JSON.stringify(data));
                callback(null,data);
            }

        })

    } else {


        _initConnection(body.url,function(err) {

            if (err) callback(err);

            _readAllTables(function(err,data) {

                if (err) return res.status(500).send(err);
                else {
                   console.log("successfully read tables, data %s", JSON.stringify(data));
                   callback(null,data);
                }

            })
        })  

    }


}



function _runQuery(query,fn) {

     db.reserve(function(err,connObj) {

        if (connObj) {

            console.log("Using connection: " + connObj. uuid + " to run query");
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

                    winston.info("Executing query: %s" , query);
                    statement.executeQuery(query,function(err,results) {
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
                }
            ],function(err,arrayOfData) {
                var errorFromFuncions = err;
                db.release(connObj,function(err) {
                    if (err || errorFromFuncions) {

                        winston.error("Error running query");
                        console.log("err in releasing db : %s", err);
                        console.log("err from function executing query : %s",errorFromFuncions);
                        fn(err);
                    } else {
                        fn(null,arrayOfData);
                    }
                })
            })
        }
    })
}


function _asyncRunQueries(queries,fn) {
    var results = {};
    async.each(queries,function(q,callback) {

        _runQuery(q,function(err,ret) {
            if (err) callback(err);
            else {
                console.log("returned obj");
                console.log(ret);
                callback();
            }

        })
    },function(err) {
        console.log("done query");
        // console.log(err);
        // console.log(results);
    })


}


module.exports.readData = function(url,query,fn) {


    if (!db) {

        _initConnection(url,function(err) {

            if (err) fn(err);

            else {
                _runQuery(query,fn);
            }
        })

    } else {

        _runQuery(query,fn);

    }
}


module.exports.prepareFilters = function(queriesWithSemiColon,fn) {
    _asyncRunQueries(queriesWithSemiColon,fn);
}