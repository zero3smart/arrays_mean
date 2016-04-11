//
//
// NOTE: Run this from arrays-server-js via bin/_*_MVP_DB_seed
//
require('dotenv').config();
//
var dataSourceDescriptions = require('./MVP_datasource_descriptions').Descriptions;
//
//
// Set up application runtime object graph
//
var context = require('./import_context').NewHydratedContext();
// And initiate import
context.import_controller._Import_dataSourceDescriptions__enteringImageScrapingDirectly(dataSourceDescriptions);
