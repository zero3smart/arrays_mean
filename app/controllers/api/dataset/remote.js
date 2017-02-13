
var datasource_description = require('../../../models/descriptions');
var hadoop = require('../../../libs/datasources/hadoop');

module.exports.connect = function(req,res) {

	if (req.body.type == 'hadoop') {
		hadoop.initConnection(req,res);
	}
}


module.exports.getColumnsForFieldMapping = function(req,res) {
	
	if (req.body.type == 'hadoop') {
		hadoop.readColumnsForJoin(req,res);
	}

}
