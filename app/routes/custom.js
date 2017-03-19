var winston = require('winston');
var express = require('express');
var queryString = require('querystring');
var router = express.Router();
var path = require('path');
var ensureAuthorized = require('../libs/middleware/ensure-authorized').ensureAuthorized;
var teams = require('../models/teams');
var team_show_controller = require('../controllers/client/data_preparation/team/show');


//serving static file
router.get('/static/*', function(req,res) {
    var customStaticFileLocation = path.join(__dirname ,'/../../user/' + req.subdomains[0],req.url);
    res.sendFile(customStaticFileLocation);
});

//team page
router.get('/',function(req,res) {
   
    teams.GetTeamBySubdomain(req, function (err, teamDescriptions) {

        if (err && err.message != 'No SubDomain Asked!') {
            winston.error("❌  Error getting bind data during authorizing : ", err);
            return res.status(500).send(err.response || 'Internal Server Error');
        }
    
        team_show_controller.BindData(req, teamDescriptions[0], function (err, bindData) {
            if (err) {
                winston.error("❌  Error getting bind data for Team show: ", err);
                return res.status(500).send(err.response || 'Internal Server Error');
            }
            return res.render('team/show', bindData);
        });

    });



})






router.get('/:source_key', ensureAuthorized, function(req,res) {
    var source_key = req.params.source_key;
    if (source_key == null || typeof source_key == 'undefined' || source_key == "") {
        res.status(403).send("Bad Request - source_key missing")
        return;
    }
    var customViewFileLocation = __dirname + '/../../user/' + req.subdomains[0] + '/views/index';
    res.render(customViewFileLocation);
})

router.get('/:source_key/getData',ensureAuthorized,function(req,res) {

    var team = req.subdomains[0];
    if (!team && process.env.subdomain) {
        team = process.env.subdomain;
    }
    var controller = require('../../user/' + team + '/src/controller');
    controller.BindData(req,function(err,bindData) {
        if (err) {
             winston.error("❌  Error getting bind data for custom view %s , err: %s" ,team,err);
            return res.status(500).send(err.response || 'Internal Server Error');
        }
        winston.info("💬   getting data for custom view: %s", team);
        res.json(bindData);

    })
})

module.exports = router;
