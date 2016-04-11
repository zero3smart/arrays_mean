var winston = require('winston');
var url = require('url');
//
//
// Template rendering dummy bind data factory functions
// 
function __new_bindPayloadFor_homepage(context, callback)
{
    var bindPayload = 
    {
        aMessage: "Hello! This is the homepage."
    };
    var err = null;

    callback(err, bindPayload);
}
function __new_bindPayloadFor_array_create(context, callback)
{
    context.API_data_preparation_controller.DataFor_datasetsListing(function(err, data)
    {
        if (err) {
            callback(err, null);
            
            return;
        }
        // The data is unpacked redundantly here not only to give the chance to add
        // additional data, but also so as to guard against hidden breakage in case
        // the return value of DataFor_datasetsListing changes:
        var bindPayload = 
        {
            sources: data.sources
        };
        callback(null, bindPayload);
    });
}
function __new_bindPayloadFor_array_gallery(context, urlQuery, callback)
{                                                 // ^ already validated to have source_key
    var parameters =
    {
        source_pKey: urlQuery.source_key,
        //
        pageNumber: urlQuery.page ? urlQuery.page : 1,
        pageSize: context.API_data_preparation_controller.PageSize(), // not configurable by url
        //
        sortByColumnName: urlQuery.sortBy ? urlQuery.sortBy : "Object Title",
        sortDirection: urlQuery.sortDir ? urlQuery.sortDir == 'Ascending' ? 1 : -1 : 1,
        //
        filterColumn: urlQuery.filterCol, // if undefined, not filtered
        filterValue: urlQuery.filterVal,
        //
        searchQueryString: urlQuery.searchQ, // if undefined or "", no search active
        searchValuesOfColumn: urlQuery.searchCol 
    };
    context.API_data_preparation_controller.DataFor_array_gallery(parameters, function(err, data)
    {
        if (err) {
            callback(err, null);
            
            return;
        }
        var bindPayload = 
        {
            docs: data.docs
        };
        callback(null, bindPayload);
    });
}
function __new_bindPayloadFor_object_show(context, callback)
{
    var bindPayload = 
    {
        arrayTitle: "Cooper Hewitt",
        aMessage: "Hello! This is the show object page."
    };
    var err = null;
    
    callback(err, bindPayload);
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
    // console.log('routes controller is up');
};

constructor.prototype.MountRoutes = function()
{
    var self = this;
    self._mountRoutes_monitoring();
    self._mountRoutes_viewEndpoints();
    self._mountRoutes_JSONAPI();
    self._mountRoutes_errorHandling();
};
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
constructor.prototype._mountRoutes_viewEndpoints = function()
{
    var self = this;
    self._mountRoutes_viewEndpoints_homepage();
    self._mountRoutes_viewEndpoints_array();
    self._mountRoutes_viewEndpoints_object();
};
constructor.prototype._mountRoutes_viewEndpoints_homepage = function()
{
    var self = this;
    var context = self.context;
    var app = context.app;
    app.get('/', function(req, res)
    {
        __new_bindPayloadFor_homepage(context, function(err, bindPayload)
        {
            if (err) {
                self._renderBindPayloadError(err, req, res);
                
                return;
            }
            res.render('homepage/homepage', bindPayload);
        });
    });
};
constructor.prototype._mountRoutes_viewEndpoints_array = function()
{
    var self = this;
    var context = self.context;
    var app = context.app;
    app.get('/array/create', function(req, res)
    {
        __new_bindPayloadFor_array_create(context, function(err, bindPayload) 
        {
            if (err) {
                self._renderBindPayloadError(err, req, res);
                
                return;
            }
            res.render('array/create', bindPayload);
        });
    });
    app.get('/array/gallery', function(req, res)
    {
        var url_parts = url.parse(req.url, true);
        var query = url_parts.query;
        var source_key = query.source_key;
        if (source_key == null || typeof source_key === 'undefined' || source_key == "") {
            res.status(403).send("Bad Request - source_key missing from url query")
            
            return;
        }        
        __new_bindPayloadFor_array_gallery(context, query, function(err, bindPayload) 
        {
            if (err) {
                self._renderBindPayloadError(err, req, res);
                
                return;
            }
            res.render('array/gallery', bindPayload);
        });
    });
    app.get('/array/chart', function(req, res)
    {
        __new_bindPayloadFor_array_chart(context, function(err, bindPayload) 
        {
            if (err) {
                self._renderBindPayloadError(err, req, res);
                
                return;
            }
            res.render('array/chart', bindPayload);
        });
    });
    app.get('/array/heatmap', function(req, res)
    {
        __new_bindPayloadFor_array_heatmap(context, function(err, bindPayload) 
        {
            if (err) {
                self._renderBindPayloadError(err, req, res);
                
                return;
            }
            res.render('array/gallery', bindPayload);
        });
    });
};
constructor.prototype._mountRoutes_viewEndpoints_object = function()
{
    var self = this;
    var context = self.context;
    var app = context.app;
    app.get('/object', function(req, res)
    {
        __new_bindPayloadFor_object_show(context, function(err, bindPayload)
        {
            if (err) {
                self._renderBindPayloadError(err, req, res);
                
                return;
            }
            res.render('object/show', bindPayload);
        });
    });
};
constructor.prototype._renderBindPayloadError = function(err, req, res)
{
    var self = this;
    var context = self.context;
    // TODO: render a view template?
    res.status(500).send(err.response || 'Internal Server Error');
};
constructor.prototype._mountRoutes_JSONAPI = function()
{
    var self = this;
    
    var apiVersion = 'v1';
    var apiURLPrefix = '/' + apiVersion + '/';
    
    self._mountRoutes_JSONAPI__DEBUG_cannedQuestions_MoMA(apiURLPrefix);
};

constructor.prototype._mountRoutes_JSONAPI__DEBUG_cannedQuestions_MoMA = function(apiURLPrefix)
{
    var self = this;
    var context = self.context;
    var app = context.app;
    //
    var asker = require('../questions/MoMA_canned_questions_asker');
    //
    app.get(apiURLPrefix + 'DEBUG_MoMA', function(req, res)
    {
        asker.Ask(function(err, results) 
        {
            if (err) {
                res.json({ ok: 0, err: err });
                
                return;
            }
            res.json({ ok: 1, results: results });
        });
    });
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