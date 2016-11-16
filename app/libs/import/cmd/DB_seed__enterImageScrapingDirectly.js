//
//
// NOTE: Run this from arrays-server-js via bin/_*_MVP_DB_seed
//
var dotenv_path = __dirname + "/../../../../config/env/.env." + (process.env.NODE_ENV ? process.env.NODE_ENV : "development");
require('dotenv').config({
    path: dotenv_path
});
//
var datasources = require('./cmd_parser').GetDatasources();
var dataSourceDescriptions = require('../../../models/descriptions')
var import_controller = require('../data_ingest/controller');


dataSourceDescriptions.GetDescriptionsToSetup(datasources, function (descriptions_array) {
    import_controller.Import_dataSourceDescriptions__enteringImageScrapingDirectly(descriptions_array);
// 
});




