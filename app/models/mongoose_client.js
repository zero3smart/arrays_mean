var mongoose = require('mongoose');
var winston = require('winston');
//
var dbURI = process.env.MONGODB_URI;

if (!dbURI) dbURI = 'mongodb://localhost/arraysdb';
//
winston.info("💬  MongoDB URI: ", dbURI);
mongoose.Promise = require('q').Promise;

var options = { server: { socketOptions: { keepAlive: 300000, connectTimeoutMS: 30000 } }, 
                replset: { socketOptions: { keepAlive: 300000, connectTimeoutMS : 30000 } } }; 


mongoose.connect(dbURI,options);

exports.mongoose = mongoose;
//
var isConnected = false;
var erroredOnConnection = false;
//
var connection = mongoose.connection;
connection.on('error', function (err) {
    erroredOnConnection = true;
    winston.error("❌  MongoDB connection error:", err);
});
connection.once('open', function () {
    isConnected = true;
    winston.info("📡  Connected to " + process.env.NODE_ENV + " MongoDB.");
});
exports.connection = connection;
//
function WhenMongoDBConnected(fn) {
    if (isConnected == true) {
        fn();

        return;
    } else if (erroredOnConnection == true) {
        winston.warn("⚠️  Not going to call blocked Mongo fn,", fn);

        return;
    }
    var period_ms = 100;
    winston.info("💬  Waiting " + period_ms + "ms until MongoDB is connected….");
    setTimeout(function () {
        WhenMongoDBConnected(fn);
    }, period_ms);
}
exports.WhenMongoDBConnected = WhenMongoDBConnected;

var _mustBuildIndexes_hasBeenInitialized = false;
var _mustBuildIndexes_forNRemaining = 0;
function FromApp_Init_IndexesMustBeBuiltForSchemaWithModelsNamed(modelNames) {
    if (_mustBuildIndexes_hasBeenInitialized == true) {
        console.log("Mustn't call this more than once");
        process.exit(1);
    }
    _mustBuildIndexes_hasBeenInitialized = true;
    _mustBuildIndexes_forNRemaining = modelNames.length;
}
exports.FromApp_Init_IndexesMustBeBuiltForSchemaWithModelsNamed = FromApp_Init_IndexesMustBeBuiltForSchemaWithModelsNamed;
function _mustBuildIndexes_areAllFinishedBuilding() {
    return _mustBuildIndexes_hasBeenInitialized == true
        && _mustBuildIndexes_forNRemaining == 0;
}
function WhenIndexesHaveBeenBuilt(fn) {
    if (_mustBuildIndexes_areAllFinishedBuilding() == true) {
        winston.info("💬  All indexes finished building.");
        fn();

        return;
    }
    setTimeout(function () {
        // console.log("💬  Waiting for indexes to finish building.")
        WhenIndexesHaveBeenBuilt(fn);
    }, 100);
}
exports.WhenIndexesHaveBeenBuilt = WhenIndexesHaveBeenBuilt;
function FromModel_IndexHasBeenBuiltForSchemeWithModelNamed(modelName) {
    _mustBuildIndexes_forNRemaining -= 1;
}
exports.FromModel_IndexHasBeenBuiltForSchemeWithModelNamed = FromModel_IndexHasBeenBuiltForSchemeWithModelNamed;


function _dropColletion(collection, cb) {

    if (!collection || collection == '') cb(new Error('Must provide collection name to drop.'));
    connection.db.dropCollection(collection, cb);

}

exports.dropCollection = _dropColletion;


function checkIfCollectionExists(collectionName, fn) {
    connection.db.listCollections({name: collectionName})
        .next(function (err, collinfo) {
            if (err) {
                winston.error(" ❌  mongoDB error when finding if collection exists : ", err);
                return fn(err);
            } else {
                if (collinfo !== null) {
                    return fn(null, true);
                } else {
                    return fn(null, false);
                }

            }
        });
}

exports.checkIfCollectionExists = checkIfCollectionExists


function checkIfDatasetImportedInSchemaCollection(collectionName, dataset_uid, fn) {

    connection.db.listCollections({name: collectionName})
        .next(function (err, collinfo) {
            if (err) {
                winston.error(" ❌  mongoDB error when finding if collection exists : ", err);
                return fn(err);
            } else {
                if (collinfo !== null) {
                    connection.db.collection(collectionName, function (err, collection) {
                        collection.count({pKey: {$regex: "^" + dataset_uid + "-"}}, function (err, cnt) {

                            if (err) {
                                winston.error(" ❌  mongoDB error when finding if collection exists : ", err);
                                return fn(err);
                            } else {
                                if (cnt > 0) {
                                    return fn(null, true);
                                } else {
                                    return fn(null, false);
                                }
                            }
                        })

                    })

                } else {
                    return fn(null, false);
                }

            }
        })
}

exports.checkIfDatasetImportedInSchemaCollection = checkIfDatasetImportedInSchemaCollection