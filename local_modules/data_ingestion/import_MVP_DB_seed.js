//
// NOTE: Run this from arrays-server-js via bin/_*_MVP_DB_seed
//
// 
//
//
const import_datatypes = require('./import_datatypes');
const import_processing = require('./import_processing');
const datasource_descriptions = require('./MVP_datasource_descriptions')
//
const dataSourceDescriptions = datasource_descriptions.Descriptions;
//
// Set up application runtime object graph
const context = require('./import_context').NewHydratedContext();
// Now import
context.import_controller.Import_dataSourceDescriptions(dataSourceDescriptions);
