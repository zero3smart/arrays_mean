var express = require('express');
var router = express.Router();
var url = require('url');
var winston = require('winston');
var ensureLoggedIn = require('connect-ensure-login').ensureLoggedIn();
var team_show_controller = require('../controllers/post_process/data_preparation/team/show');

// router.get('/team', function(req, res) {
//     context.data_preparation_index_controller.BindData_index(function(err, bindData) {
//         if (err) {
//             winston.error("❌  Error getting bind data for Array index: ", err);
//             res.status(500).send(err.response || 'Internal Server Error');

//             return;
//         }
//         res.render('team/index', bindData);
//     });
// });

router.get('/:team_key', function(req, res) {
    var team_key = req.params.team_key;
    if (team_key === null || typeof team_key === 'undefined' || team_key === "") {
        res.status(403).send("Bad Request - team_key missing");

        return;
    }

    var url_parts = url.parse(req.url, true);
    var query = url_parts.query;

    query.team_key = team_key;

    team_show_controller.BindData(query, function(err, bindData) {
        if (err) {
            winston.error("❌  Error getting bind data for Team show: ", err);
            res.status(500).send(err.response || 'Internal Server Error');

            return;
        }
        res.render('team/show', bindData);
    });
});

module.exports = router;