var winston = require('winston');
var url = require('url');
var express = require('express');
var router = express.Router();
var teams = require('../models/teams');

var team_show_controller = require('../controllers/client/data_preparation/team/show');

router.get('/', function (req, res, next) {
    teams.GetTeamBySubdomain(req.subdomains, function(err, teamDescription) {
        if (err) return next();
        // No team exists
        if (!teamDescription) return next();

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
});

router.get('/', function (req, res) {
    var bindData =
    {
        env: process.env
    };
    res.render('homepage/homepage', bindData);
});

module.exports = router;