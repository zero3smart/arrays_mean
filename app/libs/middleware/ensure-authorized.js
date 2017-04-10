var winston = require('winston');
var datasourceDescriptions = require('../../models/descriptions');

module.exports.ensureAuthorized = function(req, res, next) {
    // Ensure the user is authorized to the dataset


    var sourceKey;



    if (typeof req.params.source_key == 'undefined') {

        sourceKey = req.params[0];


        sourceKey = process.env.NODE_ENV !== 'enterprise' ? req.subdomains[0] + '-' + sourceKey.substring(1) : sourceKey.substring(1)



    } else {
        sourceKey = process.env.NODE_ENV !== 'enterprise' ? req.subdomains[0] + '-' + req.params.source_key : req.params.source_key;
    }

    datasourceDescriptions.GetDatasourceByUserAndKey(req.user, sourceKey, function(err, datasource) {
        if (err) {
            winston.error("❌  Error getting bind data to authoriziing: ", err);
            return res.status(500).send(err.response || 'Internal Server Error');
        }

        if (!datasource) return res.redirect('/');

        next();
    });

}