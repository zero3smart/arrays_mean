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
var datasources = process.argv.slice(2);
var dataSourceDescriptions = require('./datasource_descriptions').GetDescriptionsToSetup(datasources);
//
//
// Set up application runtime object graph
//
var context = require('./import_context').NewHydratedContext();
// And initiate import
context.import_controller.Import_dataSourceDescriptions(dataSourceDescriptions);
