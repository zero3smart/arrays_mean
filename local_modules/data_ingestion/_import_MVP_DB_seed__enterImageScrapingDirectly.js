//
//
// NOTE: Run this from arrays-server-js via bin/_*_MVP_DB_seed
//
require('dotenv').config();
//
const dataSourceDescriptions = require('./MVP_datasource_descriptions').Descriptions;
//
//
// Set up application runtime object graph
//
const context = require('./import_context').NewHydratedContext();
// And initiate import
context.import_controller._Import_dataSourceDescriptions__enteringImageScrapingDirectly(dataSourceDescriptions);
