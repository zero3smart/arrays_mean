
var datasource_description = require('../../../models/descriptions');
var hadoop = require('../../../libs/datasources/hadoop');

module.exports.connect = function(req,res) {

	if (req.body.type == 'hadoop') {
		var body = {
			url: req.body.url
		};	
		hadoop.initConnection(body,function(err,data) {
			if (err) return res.status(500).send(err);
			else if (data) {
				req.session[req.params.id] = {};
                req.session[req.params.id].tables = data;
				return res.json(data);
			}

		})
	}
}



module.exports.getColumnsForFieldMapping = function(req,res) {
	
	if (req.body.type == 'hadoop') {
		if (req.session[req.params.id].column && req.session[req.params.id].columns[req.body.join.tableName])  
			return res.json(req.session[req.params.id].columns[req.body.join.tableName]);

		var body = {
			url: req.body.url
		}

		hadoop.readColumnsAndSample(body,req.body.join.tableName,function(err,data) {
			if (err) return res.status(500).send(err);

			else if (data) {
				if (!req.session[req.params.id].columns) req.session[req.params.id].columns = {};

                req.session[req.params.id].columns[req.body.join.tableName] = data;
				return res.json(data);
			}


		})

		
	}

}
