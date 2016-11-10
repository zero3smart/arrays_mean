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
//
//
var cache_keywords_controller = require('../cache/keywords_controller');

dataSourceDescriptions.GetDescriptionsToSetup(datasources, function (descriptions_array) {
    cache_keywords_controller.CacheKeywords_dataSourceDescriptions(descriptions_array);

});


