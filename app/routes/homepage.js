var express = require('express');
var router = express.Router();
var teams = require('../models/teams');
var winston = require('winston');

var team_show_controller = require('../controllers/client/data_preparation/team/show');

router.get('/', function (req, res, next) {
    var team_key = null;
    var subdomains = req.subdomains;
    if (subdomains.length >= 1) {
        if (subdomains[subdomains.length - 1] == 'staging') {
            subdomains.splice(-1, 1);
        }
        team_key = subdomains.join('.');
    }

    winston.info("📡 accessed from the team with key - ", team_key);

    if (team_key === null || typeof team_key === 'undefined' || team_key === "") {
        return next();
    }

    teams.GetTeamBySubdomain(team_key, function(err, teamDescription) {
        if (err) return next();

        var url_parts = url.parse(req.url, true);
        var query = url_parts.query;

        query.team_key = team_key;

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