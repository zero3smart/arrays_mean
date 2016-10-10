module.exports.index = function(req, next) {
    var self = this;

    var data = {
        env: process.env,

        flash: req.flash('message'),
        
        user: req.user,
        pageTitle: "Website Settings"
    };

    next(null, data);
};