//
//
//
var mongoose = require('mongoose');
const winston = require('winston');
//
const dbName = 'arraysdb'
const developmentDBURI = 'mongodb://localhost/' + dbName
//
const productionDBUsername = 'arraysserver'
const productionDBPassword = 'AAELBzHUm73Ra9g5' // TODO: move this out of repo?
const productionDBURI = 'mongodb://' + productionDBUsername 
                        + ':' + productionDBPassword 
                        + '@ds019239-a0.mlab.com:19239,ds019239-a1.mlab.com:19239/' 
                        + dbName 
                        + '?replicaSet=rs-ds019239'
//
var fullDBURI = process.env.NODE_ENV == 'development' ? developmentDBURI : productionDBURI
//
winston.info("💬  MongoDB URI: " , fullDBURI)
mongoose.connect(fullDBURI)
exports.mongoose = mongoose
//
var isConnected = false
var erroredOnConnection = false
//
var connection = mongoose.connection
connection.on('error', function(err)
{
    erroredOnConnection = true
    winston.error("❌  MongoDB connection error:", err)
})
connection.once('open', function()
{
    isConnected = true
    winston.info("📡  Connected to " + process.env.NODE_ENV + " MongoDB.")
})
exports.connection = connection
//
function WhenMongoDBConnected(fn)
{
    if (isConnected == true) {
        fn()
        
        return
    } else if (erroredOnConnection == true) {
        winston.warn("‼️  Not going to call blocked Mongo fn,", fn)
        
        return
    }
    var period_ms = 100
    winston.info("💬  Waiting " + period_ms + "ms until MongoDB is connected….")
    setTimeout(function()
    {
        WhenMongoDBConnected(fn)
    }, period_ms)
}
exports.WhenMongoDBConnected = WhenMongoDBConnected
//
//
//
var _mustBuildIndexes_hasBeenInitialized = false
var _mustBuildIndexes_forNRemaining = 0
function FromApp_Init_IndexesMustBeBuiltForSchemaWithModelsNamed(modelNames) {
    if (_mustBuildIndexes_hasBeenInitialized == true) {
        console.log("Mustn't call this more than once")
        process.exit(1)
    }
    _mustBuildIndexes_hasBeenInitialized = true
    _mustBuildIndexes_forNRemaining = modelNames.length
}
exports.FromApp_Init_IndexesMustBeBuiltForSchemaWithModelsNamed = FromApp_Init_IndexesMustBeBuiltForSchemaWithModelsNamed
function _mustBuildIndexes_areAllFinishedBuilding() {
    return _mustBuildIndexes_hasBeenInitialized == true 
            && _mustBuildIndexes_forNRemaining == 0
}
function WhenIndexesHaveBeenBuilt(fn) {
    if (_mustBuildIndexes_areAllFinishedBuilding() == true) {
        winston.info("💬  All indexes finished building.")
        fn()
        
        return
    }
    setTimeout(function() {
        // console.log("💬  Waiting for indexes to finish building.")
        WhenIndexesHaveBeenBuilt(fn)
    }, 100)
}
exports.WhenIndexesHaveBeenBuilt = WhenIndexesHaveBeenBuilt
function FromModel_IndexHasBeenBuiltForSchemeWithModelNamed(modelName) {
    _mustBuildIndexes_forNRemaining -= 1
}
exports.FromModel_IndexHasBeenBuiltForSchemeWithModelNamed = FromModel_IndexHasBeenBuiltForSchemeWithModelNamed