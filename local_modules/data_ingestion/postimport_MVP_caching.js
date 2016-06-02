//
//
// NOTE: Run this from arrays-server-js via bin/_*_MVP_DB_seed
//
var dotenv_path = __dirname + "/../../.env." + process.env.NODE_ENV;
var dotenv_config =
{
    path: dotenv_path
};
require('dotenv').config(dotenv_config);
//
var dataSourceDescriptions = require('./MVP_datasource_descriptions').Descriptions;
//
//
// Set up application runtime object graph
//
var context = require('./postimport_context').NewHydratedContext();
// And initiate import
context.postimport_caching_controller.GeneratePostImportCaches(dataSourceDescriptions);
