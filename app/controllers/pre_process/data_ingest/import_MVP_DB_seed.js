//
//
// NOTE: Run this from arrays-server-js via bin/_*_MVP_DB_seed
//
var dotenv_path = __dirname + "/../../../../config/env/.env." + (process.env.NODE_ENV ? process.env.NODE_ENV : "development");
require('dotenv').config({
    path: dotenv_path
});
//
var datasources = require('../cmd_parser').GetDatasources();

var dataSourceDescriptions = require('../../../datasources/descriptions').GetDescriptionsToSetup(datasources);
//
//
var import_controller = require('./import_controller');
import_controller.Import_dataSourceDescriptions(dataSourceDescriptions);