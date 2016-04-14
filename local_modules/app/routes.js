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
    self._mountRoutes_viewEndpoints_sharedPages();
};
constructor.prototype._mountRoutes_viewEndpoints_homepage = function()
{
    var self = this;
    var context = self.context;
    var app = context.app;
    app.get('/', function(req, res)
    {
        var bindData = 
        {
        };
        // res.render('homepage/homepage', bindData);

        // Temporary redirect to splash page
        res.redirect(302, '/splash');
    });
};
constructor.prototype._mountRoutes_viewEndpoints_array = function()
{
    var self = this;
    var context = self.context;
    var app = context.app;
    app.get('/array/create', function(req, res)
    {
        context.API_data_preparation_controller.BindDataFor_datasetsListing(function(err, bindData)
        {
            if (err) {
                self._renderBindDataError(err, req, res);
            
                return;
            }
            res.render('array/create', bindData);
        });
    });
    app.get('/array/:source_key/gallery', function(req, res)
    {
        var source_key = req.params.source_key;
        if (source_key == null || typeof source_key === 'undefined' || source_key == "") {
            res.status(403).send("Bad Request - source_key missing")
            
            return;
        }
        var url_parts = url.parse(req.url, true);
        var query = url_parts.query;
        self.__render_array_gallery(req, res, source_key, query);
    });
    app.get('/array/:source_key/chart', function(req, res)
    {
        var source_key = req.params.source_key;
        if (source_key == null || typeof source_key === 'undefined' || source_key == "") {
            res.status(403).send("Bad Request - source_key missing")
            
            return;
        }
        var url_parts = url.parse(req.url, true);
        var query = url_parts.query;
        self.__render_array_chart(req, res, source_key, query);
    });
    app.get('/array/:source_key/heatmap', function(req, res)
    {
        var source_key = req.params.source_key;
        if (source_key == null || typeof source_key === 'undefined' || source_key == "") {
            res.status(403).send("Bad Request - source_key missing")
            
            return;
        }
        var url_parts = url.parse(req.url, true);
        var query = url_parts.query;
        self.__render_array_heatmap(req, res, source_key, query);
    });
};

constructor.prototype.__render_array_gallery = function(req, res, source_key, query)
{
    var self = this;
    var context = self.context;
    query.source_key = source_key;
    context.API_data_preparation_controller.BindDataFor_array_gallery(query, function(err, bindData)
    {
        if (err) {
            winston.error("❌  Error getting bind data for Array gallery: ", err);
            self._renderBindDataError(err, req, res);
            
            return;
        }
        res.render('array/gallery', bindData);
    });
};
constructor.prototype.__render_array_chart = function(req, res, source_key, query)
{
    var self = this;
    var context = self.context;
    query.source_key = source_key;
    context.API_data_preparation_controller.BindDataFor_array_chart(query, function(err, bindData)
    {
        if (err) {
            winston.error("❌  Error getting bind data for Array chart: ", err);
            self._renderBindDataError(err, req, res);
            
            return;
        }
        res.render('array/chart', bindData);
    });
};
constructor.prototype.__render_array_heatmap = function(req, res, source_key, query)
{
    var self = this;
    var context = self.context;
    query.source_key = source_key;
    context.API_data_preparation_controller.BindDataFor_array_gallery(query, function(err, bindData)
    {
        if (err) {
            winston.error("❌  Error getting bind data for Array heatmap: ", err);
            self._renderBindDataError(err, req, res);
            
            return;
        }
        res.render('array/heatmap', bindData);
    });
};
//
//
constructor.prototype._mountRoutes_viewEndpoints_object = function()
{
    var self = this;
    var context = self.context;
    var app = context.app;
    app.get('/array/:source_key/:object_id', function(req, res)
    {
        var source_key = req.params.source_key;
        if (source_key == null || typeof source_key === 'undefined' || source_key == "") {
            res.status(403).send("Bad Request - source_key missing")
            
            return;
        }
        var object_id = req.params.object_id;
        if (object_id == null || typeof object_id === 'undefined' || object_id == "") {
            res.status(403).send("Bad Request - object_id missing")
            
            return;
        }
        self.__render_array_rowObject(req, res, source_key, object_id);
    });
};
constructor.prototype.__render_array_rowObject = function(req, res, source_key, object_id)
{
    var self = this;
    var context = self.context;
    context.API_data_preparation_controller.BindDataFor_array_objectDetails(source_key, object_id, function(err, bindData) 
    {
        if (err) {
            winston.error("❌  Error getting bind data for Array source_key " + source_key + " object " + object_id + " details: ", err);
            self._renderBindDataError(err, req, res);
        
            return;
        }    
        if (bindData == null) { // 404
            self._renderNotFound(err, req, res);
            
            return;
        }
        res.render('object/show', bindData);
    });
};
//
//

constructor.prototype._mountRoutes_viewEndpoints_sharedPages = function()
{
    var self = this;
    var context = self.context;
    var app = context.app;
    app.get('/s/:shared_page_id', function(req, res)
    {
        var shared_page_id = req.params.shared_page_id;
        if (shared_page_id == null || typeof shared_page_id === 'undefined' || shared_page_id == "") {
            res.status(403).send("Bad Request - shared_page_id missing")
            
            return;
        }
        context.shared_pages_controller.FindOneWithId(shared_page_id, function(err, doc)
        {
            if (err) {
                res.status(500).send("Internal Server Error");
                
                return;
            }
            if (doc == null) {
                self._renderNotFound(err, req, res);

                return;
            }
            var source_key = doc.sourceKey;
            if (source_key == null || typeof source_key === 'undefined' || source_key == "") {
                res.status(500).send("Internal Server Error");
                
                return;
            }
            var pageType = doc.pageType;
            if (pageType == "array_view") {
                var viewType = doc.viewType;
                var query = doc.query || {};
                if (viewType == "gallery") {
                    self.__render_array_gallery(req, res, source_key, query);
                } else if (viewType == "chart") {
                    self.__render_array_chart(req, res, source_key, query);
                } else if (viewType == "heatmap") {
                    self.__render_array_heatmap(req, res, source_key, query);
                } else {
                    res.status(500).send("Internal Server Error");
                }
            } else if (pageType == "object_details") {
                var rowObjectId = doc.rowObjectId;
                if (rowObjectId == null || typeof rowObjectId === 'undefined' || rowObjectId == "") {
                    res.status(500).send("Internal Server Error");
                
                    return;
                }
                self.__render_array_rowObject(req, res, source_key, rowObjectId);                
            } else {
                res.status(500).send("Internal Server Error");
            }
        });
    });
};
//
//
constructor.prototype._renderBindDataError = function(err, req, res)
{
    var self = this;
    var context = self.context;
    // TODO: render a view template?
    res.status(500).send(err.response || 'Internal Server Error');
};
constructor.prototype._renderNotFound = function(err, req, res)
{
    var self = this;
    var context = self.context;
    // TODO: render a view template?
    res.status(404).send(err.response || 'Not Found');
};
constructor.prototype._mountRoutes_JSONAPI = function()
{
    var self = this;
    
    var apiVersion = 'v1';
    var apiURLPrefix = '/' + apiVersion + '/';
    
    self._mountRoutes_JSONAPI_arrayShare(apiURLPrefix);
    self._mountRoutes_JSONAPI__DEBUG_cannedQuestions_MoMA(apiURLPrefix);
};
constructor.prototype._mountRoutes_JSONAPI_arrayShare = function(apiURLPrefix)
{
    var self = this;
    var context = self.context;
    var app = context.app;
    //
    app.post(apiURLPrefix + 'share', function(req, res)
    {
        var urlContainingShareParams = req.body.url;
        if (typeof urlContainingShareParams === 'undefined' || urlContainingShareParams == null || urlContainingShareParams == "") {
            res.status(400).send("url parameter required");
            
            return;
        }
        var url_parts = url.parse(urlContainingShareParams, true);
        var pathname = url_parts.pathname;
        var query = url_parts.query;
        //
        var pageType;
        var viewType_orNull = null;
        var source_key; // the array's pKey
        var rowObjectId_orNull = null;
        function _stringFromPathNameWithRegEx(matcherRegEx)
        {
            var matches = matcherRegEx.exec(pathname);
            if (matches.length <= 1) {
                return null;
            }
            
            return matches[1];
        }
        if (/^\/array\/.*\/(gallery|chart|heatmap)/g.test(pathname) == true) {
            pageType = "array_view";
            //
            if (/^\/array\/.*\/gallery/g.test(pathname) == true) {
                viewType_orNull = 'gallery';
            } else if (/^\/array\/.*\/chart/g.test(pathname) == true) {
                viewType_orNull = "chart";
            } else if (/^\/array\/.*\/heatmap/g.test(pathname) == true) {
                viewType_orNull = "heatmap";
            } else {
                // this will not happen unless the if above changes and this if structure does not get updated
                res.status(500).send("Internal Server Error");
                
                return;
            }
            //
            source_key = _stringFromPathNameWithRegEx(/^\/array\/(.*)\/(gallery|chart|heatmap)/g);
        } else if (/^\/array\/.*\/.*/g.test(pathname) == true) {
            pageType = "object_details";
            //
            source_key = _stringFromPathNameWithRegEx(/^\/array\/(.*)\/.*/g);
            //
            rowObjectId_orNull = _stringFromPathNameWithRegEx(/^\/array\/.*\/(.*)/g);
        } else if (/^\/s\/.*/g.test(pathname) == true) { // special case
            // Trying to share an already shared page - just use the same URL
            var alreadySharedPageId = _stringFromPathNameWithRegEx(/^\/s\/(.*)/g);
            _fabricateAndReplyWithShareURLWithSharedPageId(alreadySharedPageId);
            
            return;
        } else {
            res.status(403).send("Unable to share that URL");
            
            return;
        }
        if (source_key == null) {
            res.status(403).send("Unable to extract or locate Array source key in order to share that URL");
        
            return;
        }
        //        
        var persistableObjectTemplate = context.shared_pages_controller.New_templateForPersistableObject(pageType, viewType_orNull, source_key, rowObjectId_orNull, query);
        context.shared_pages_controller.InsertOneWithPersistableObjectTemplate(persistableObjectTemplate, function(err, sharedPageDoc)
        {
            if (err) {
                res.status(500).send("Internal Server Error");
                
                return;
            }
            var id = sharedPageDoc._id;
            _fabricateAndReplyWithShareURLWithSharedPageId(id);
        });
        function _fabricateAndReplyWithShareURLWithSharedPageId(id)
        {
            var protocol = process.env.NODE_ENV == 'production' ? 'https' : req.protocol; // we don't just
            // look at req.protocol since on GCloud https is handled for us, and the protocol
            // comes out as http when we look it up
            var fabricatedShareURL = protocol + '://' + req.get('host') + "/s/" + id;
            _replyWithShareURL(fabricatedShareURL);
        }
        function _replyWithShareURL(share_url)
        {
            res.json({ share_url: share_url });
        }
    });
};
//
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
//
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