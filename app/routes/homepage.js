var express = require('express');
var router = express.Router();
var winston = require('winston');
var teams = require('../models/teams');
var team_show_controller = require('../controllers/client/data_preparation/team/show');



var rootDomain = process.env.HOST ? process.env.HOST : 'localhost:9080';
var baseURL = process.env.USE_SSL === 'true' ? 'https://' : 'http://';
    baseURL += rootDomain


router.get('/', function (req, res) {

    if (process.env.NODE_ENV == 'enterprise') {

        teams.GetTeamBySubdomain(req, function (err, teamDescriptions) {

            if (err && err.message != 'No SubDomain Asked!') {
                winston.error("❌  Error getting bind data during authorizing : ", err);
                return res.status(500).send(err.response || 'Internal Server Error');
            }

            if (!teamDescriptions || teamDescriptions.length == 0
                || (err && err.message == 'No SubDomain Asked!')) {

                var bindData =
                {
                    env: process.env
                };
                return res.redirect(baseURL);
                
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


    } else {
        if (req.subdomains.length == 0 || (req.subdomains.length == 1 && req.subdomains[0] == 'www')) {
             var bindData =
            {
                env: process.env
            };
            return res.render('homepage/homepage', bindData);
        }


        if (req.subdomains[0] == 'app') {
            var index_controller = require('../controllers/client/data_preparation');
            index_controller.BindData(req, function (err, bindData) {
                if (err) {
                    winston.error("❌  Error getting bind data for Array index: ", err);
                    return res.status(500).send(err.response || 'Internal Server Error');
                }
                return res.render('array/index', bindData);
            });

        } else {

              teams.GetTeamBySubdomain(req, function (err, teamDescriptions) {



                if (err && err.message != 'No SubDomain Asked!') {
                    winston.error("❌  Error getting bind data during authorizing : ", err);
                    return res.status(500).send(err.response || 'Internal Server Error');
                }

                if (!teamDescriptions || teamDescriptions.length == 0
                    || (err && err.message == 'No SubDomain Asked!')) {

                    var bindData =
                    {
                        env: process.env
                    };
                    return res.redirect(baseURL);
                    
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

        }
    }
});


module.exports = router;