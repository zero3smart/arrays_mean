var datasource_description = require('../../models/datasource_description');

module.exports.index = function(req, next) {
    var self = this;

    var data = {
        env: process.env,

        flash: req.flash('message'),
        
        user: req.user,
        pageTitle: "Dataset Settings"
    };

    next(null, data);
};
