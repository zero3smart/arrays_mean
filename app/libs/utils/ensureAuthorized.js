var winston = require('winston');
var url = require('url');
var teams = require('../../models/teams');
var team_show_controller = require('../../controllers/client/data_preparation/team/show');

module.exports.ensureAuthorized = function(req, res, next) {
    var subdomains = req.subdomains;
    teams.GetTeamBySubdomain(subdomains, function(err, teamDescription) {
        if (err && err.message != 'No SubDomain Asked!') {
            winston.error("❌  Error getting bind data during authorizing : ", err);
            return res.status(500).send(err.response || 'Internal Server Error');
        }

        // Ensure the team is authorized (team_key & subdomains)
        var team_key = req.params.team_key;
        if (team_key) {
            return next();
        }

        // Ensure the datasource is authorized
        var source_key = req.params.source_key;
        if (source_key) {
            return next();
        }


        // Ensure the shared url is authorized
        var shared_page_id = req.params.shared_page_id;
        if (shared_page_id) {
            return next();
        }


        // Finally redirect to the base url
        if (err && err.message == 'No SubDomain Asked!') return next();
        // No team exists
        if (!teamDescription) return next();

        // If a subdomain is asked, the team page would be displayed at the base url
        var url_parts = url.parse(req.url, true);
        var query = url_parts.query;

        query.team_key = teamDescription.title;

        team_show_controller.BindData(req, query, function (err, bindData) {
            if (err) {
                winston.error("❌  Error getting bind data for Team show: ", err);
                return res.status(500).send(err.response || 'Internal Server Error');
            }
            return res.render('team/show', bindData);
        });
    });
}