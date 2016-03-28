//
//
// Template rendering dummy bind data factory functions
// 
function __new_bindPayloadFor_homepage(context)
{
    var app = context.app;
    
    return {
        aMessage: "Hello! This is the homepage."
    }
}
//
//
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
    console.log('routes controller is up');
};

constructor.prototype.MountRoutes = function()
{
    var self = this;
    self._mountRoutes_viewEndpoints();
    self._mountRoutes_JSONAPI();
    self._mountRoutes_errorHandling();
};

constructor.prototype._mountRoutes_viewEndpoints = function()
{
    var self = this;
    self._mountRoutes_viewEndpoints_homepage();
};
constructor.prototype._mountRoutes_viewEndpoints_homepage = function()
{
    var self = this;
    var context = self.context;
    var app = context.app;
    app.get('/', function(req, res)
    {
        var bindPayload = __new_bindPayloadFor_homepage(context);
        res.render('homepage/homepage', bindPayload);
    });
};
constructor.prototype._mountRoutes_JSONAPI = function()
{
    var self = this;
    var context = self.context;
    var app = context.app;
    var apiVersion = 'v1';
    var apiURLPrefix = '/' + apiVersion + '/';
};

constructor.prototype._mountRoutes_errorHandling = function()
{
    var self = this;
    var context = self.context;
    var app = context.app;
    // Add the error logger after all middleware and routes so that
    // it can log errors from the whole application. Any custom error
    // handlers should go after this.
    app.use(context.logging.errorLogger);

    app.use(function (req, res)
    {
        //  404 handler
        res.status(404).send('Not Found');
    });

    app.use(function (err, req, res, next) 
    {
        // Basic error handler
        res.status(500).send(err.response || 'Internal Server Error');
    });
    
};