var winston = require('winston');
var datasourceDescriptions = require('../../models/descriptions');

module.exports.ensureAuthorized = function(req, res, next) {
    // Ensure the user is authorized to the dataset
    var sourceKey = req.params.source_key;
    if (typeof sourceKey == 'undefined') {
    	sourceKey = req.params[0] + req.params[1];
    	sourceKey = sourceKey.substring(1);
    }

    console.log(sourceKey);

    datasourceDescriptions.GetDatasourceByUserAndKey(req.user, sourceKey, function(err, datasource) {
        if (err) {
            winston.error("❌  Error getting bind data to authoriziing: ", err);
            return res.status(500).send(err.response || 'Internal Server Error');
        }
        if (!datasource) return res.redirect('/');

        next();
    });

}