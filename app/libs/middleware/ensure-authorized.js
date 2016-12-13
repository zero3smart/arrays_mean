var winston = require('winston');
var datasourceDescriptions = require('../../models/descriptions');

module.exports.ensureAuthorized = function(req, res, next) {
    // Ensure the user is authorized to the dataset

    datasourceDescriptions.GetDatasourceByUserAndKey(req.user, req.params.source_key, function(err, datasource) {
        if (err) {
            winston.error("❌  Error getting bind data to authoriziing: ", err);
            return res.status(500).send(err.response || 'Internal Server Error');
        }
        if (!datasource) return res.redirect('/');

        next();
    });

}