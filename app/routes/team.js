var url = require('url');
var winston = require('winston');
var ensureLoggedIn = require('connect-ensure-login').ensureLoggedIn();

module.exports = function(context) {
    var app = context.app;

    // app.get('/team', function(req, res) {
    //     context.data_preparation_index_controller.BindData_index(function(err, bindData) {
    //         if (err) {
    //             winston.error("❌  Error getting bind data for Array index: ", err);
    //             res.status(500).send(err.response || 'Internal Server Error');

    //             return;
    //         }
    //         res.render('team/index', bindData);
    //     });
    // });

    app.get('/team/:team_key', function(req, res) {
        var team_key = req.params.team_key;
        if (team_key === null || typeof team_key === 'undefined' || team_key === "") {
            res.status(403).send("Bad Request - team_key missing");

            return;
        }

        var url_parts = url.parse(req.url, true);
        var query = url_parts.query;

        query.team_key = team_key;

        context.team_show_controller.BindDataFor_team_show(query, function(err, bindData) {
            if (err) {
                winston.error("❌  Error getting bind data for Team show: ", err);
                res.status(500).send(err.response || 'Internal Server Error');

                return;
            }
            res.render('team/show', bindData);
        });
    });
};