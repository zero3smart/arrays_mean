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
var datasourceDescriptions = require('../../../datasources/descriptions')
//
//
var postimport_caching_controller = require('./postimport_caching_controller');


datasourceDescriptions.GetDescriptionsToSetup(datasources,function(descriptions_array) {
	
	postimport_caching_controller.GeneratePostImportCaches(descriptions_array);
});

