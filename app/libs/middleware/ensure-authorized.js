var winston = require('winston');
var teams = require('../../models/teams');

module.exports.ensureAuthorized = function(req, res, next) {
    var team_key = req.params.team_key;
    var source_key = req.params.source_key;

    if (team_key) {
        // Ensure the team is authorized (team_key & subdomains)
        // _redirectToBase(req, res, next);
        next();

    } else if (source_key) {
        // Ensure the datasource is authorized to the dataset

        // _redirectToBase(req, res, next);
        next();
    } else {
        next();
    }
}