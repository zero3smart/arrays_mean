var mongoose = require('mongoose');
var winston = require('winston');
//
var dbName = process.env.MONGODB_DBNAME;
var dbURI = process.env.MONGODB_URI;
if (!dbURI) dbURI = 'mongodb://localhost/';
dbURI = dbURI + dbName;
//
winston.info("💬  MongoDB URI: " , dbURI);
mongoose.Promise = require('q').Promise;


mongoose.connect(dbURI);
exports.mongoose = mongoose;
//
var isConnected = false;
var erroredOnConnection = false;
//
var connection = mongoose.connection;
connection.on('error', function(err)
{
    erroredOnConnection = true;
    winston.error("❌  MongoDB connection error:", err);
});
connection.once('open', function()
{
    isConnected = true;
    winston.info("📡  Connected to " + process.env.NODE_ENV + " MongoDB.");
});
exports.connection = connection;
//
function WhenMongoDBConnected(fn)
{
    if (isConnected == true) {
        fn();
        
        return;
    } else if (erroredOnConnection == true) {
        winston.warn("⚠️  Not going to call blocked Mongo fn,", fn);
        
        return;
    }
    var period_ms = 100;
    winston.info("💬  Waiting " + period_ms + "ms until MongoDB is connected….");
    setTimeout(function()
    {
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
    setTimeout(function() {
        // console.log("💬  Waiting for indexes to finish building.")
        WhenIndexesHaveBeenBuilt(fn);
    }, 100);
}
exports.WhenIndexesHaveBeenBuilt = WhenIndexesHaveBeenBuilt;
function FromModel_IndexHasBeenBuiltForSchemeWithModelNamed(modelName) {
    _mustBuildIndexes_forNRemaining -= 1;
}
exports.FromModel_IndexHasBeenBuiltForSchemeWithModelNamed = FromModel_IndexHasBeenBuiltForSchemeWithModelNamed;