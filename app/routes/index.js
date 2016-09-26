var winston = require('winston');
var url = require('url');
//
//
////////////////////////////////////////////////////////////////////////////////
// Routes controller
//
var constructor = function(options, context)
{
    var self = this;
    self.options = options;
    self.context = context;
    
    self._init();
    
    return self;
};

module.exports = constructor;
constructor.prototype._init = function()
{
    var self = this;
    // console.log('routes controller is up');
};

constructor.prototype.MountRoutes = function()
{
    var self = this;

    self._mountRoutes_monitoring();
    self._mountRoutes_ensureWWW();

    // View endpoints
    require('./homepage')(self.context);
    require('./auth')(self.context);
    require('./array')(self.context);
    require('./team')(self.context);
    require('./object')(self.context);
    require('./shared_pages')(self.context);
    require('./jsonAPI_share')(self.context);

    self._mountRoutes_errorHandling();
};
//
constructor.prototype._mountRoutes_monitoring = function()
{
    var self = this;
    var context = self.context;
    var app = context.app;
    app.get('/_ah/health', function(req, res)
    {
        res.set('Content-Type', 'text/plain');
        res.status(200).send('ok');
    });
};
//
constructor.prototype._mountRoutes_ensureWWW = function()
{
    var isDev = process.env.NODE_ENV == 'development';
    var __DEBUG_enableEnsureWWWForDev = false; // for debug
    var shouldEnsureWWW = isDev == false || __DEBUG_enableEnsureWWWForDev;

    var self = this;
    var context = self.context;
    var app = context.app;
    app.use(function(req, res, next) {
        if (shouldEnsureWWW == false) {
            next();

            return;
        }
        var host = req.header("host");
        var protocol = "http";
        if (host.match(/^www\..*/i)) {
            next();
        } else {
            res.redirect(301, protocol + "://www." + host + req.originalUrl);
        }
    });
};
//
constructor.prototype._mountRoutes_errorHandling = function()
{
    var self = this;
    var context = self.context;
    var app = context.app;
    //
    // Add the error logger after all middleware and routes so that
    // it can log errors from the whole application. Any custom error
    // handlers should go after this.
    app.use(context.logging.errorLogger);
    //
    app.use(function(req, res)
    { // 404 handler
        // TODO: render a view template?
        res.status(404).send('Not Found');
    });
    //
    app.use(function(err, req, res, next) 
    { // Basic error handler
        // TODO: render a view template?
        res.status(500).send(err.response || 'Internal Server Error');
    });
};