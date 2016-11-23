var async = require('async');
var queryString = require('querystring');

var dataSourceDescriptions = require('../../../models/descriptions');
var teamDescriptions = require('../../../models/teams')

var Promise = require('q').Promise;

var importedDataPreparation = require('../../../libs/datasources/imported_data_preparation');
var raw_source_documents = require('../../../models/raw_source_documents');

module.exports.BindData = function (req, callback) {
    var self = this;


    teamDescriptions.GetTeamsAndPublishedDatasources(function(err,teamWithDesc) {
         callback(err, {
            env:process.env,
            user:req.user,
            sources:teamWithDesc
        })
       

    })


  


  
};

