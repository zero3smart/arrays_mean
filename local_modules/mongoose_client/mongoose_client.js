var mongoose = require('mongoose');

const dbName = 'arraysdb'
const developmentDBURI = 'mongodb://localhost/' + dbName

const productionDBUsername = 'arraysserver'
const productionDBPassword = 'AAELBzHUm73Ra9g5' // TODO: move this out of repo?
const productionDBURI = 'mongodb://' + productionDBUsername 
                        + ':' + productionDBPassword 
                        + '@ds019239-a0.mlab.com:19239,ds019239-a1.mlab.com:19239/' 
                        + dbName 
                        + '?replicaSet=rs-ds019239'

var fullDBURI = process.env.NODE_ENV == 'development' ? developmentDBURI : productionDBURI

console.log("fullDBURI " , fullDBURI)
mongoose.connect(fullDBURI)

var db = mongoose.connection
db.on('error', console.error.bind(console, 'connection error:'))
db.once('open', function()
{
    console.log("📡  Connected to " + process.env.NODE_ENV + " MongoDB.")
})