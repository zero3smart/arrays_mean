var express = require('express');
var router = express.Router();
var winston = require('winston');
var teams = require('../models/teams');
var team_show_controller = require('../controllers/client/data_preparation/team/show');

router.get('/', function (req, res) {
    console.log()
    teams.GetTeamBySubdomain(req, function (err, teamDescriptions) {
        if (err && err.message != 'No SubDomain Asked!') {
            winston.error("❌  Error getting bind data during authorizing : ", err);
            return res.status(500).send(err.response || 'Internal Server Error');
        }

        if (!teamDescriptions || teamDescriptions.length == 0
            || teamDescriptions[0].datasourceDescriptions.length == 0
            || (err && err.message == 'No SubDomain Asked!')) {
            var bindData =
            {
                env: process.env
            };
            return res.render('homepage/homepage', bindData);
        }

        // If a subdomain is asked, the team page would be displayed at the base url
        team_show_controller.BindData(req, teamDescriptions[0], function (err, bindData) {
            if (err) {
                winston.error("❌  Error getting bind data for Team show: ", err);
                return res.status(500).send(err.response || 'Internal Server Error');
            }
            return res.render('team/show', bindData);
        });
    });
});

module.exports = router;