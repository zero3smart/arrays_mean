var winston = require('winston');
var expressWinston = require('express-winston');
var url = require('url');
var path = require('path');

var isDev = !process.env.NODE_ENV || process.env.NODE_ENV == 'development';
var __DEBUG_enableEnsureWWWForDev = false; // for debug
var shouldEnsureWWW = isDev == false || __DEBUG_enableEnsureWWWForDev;



//
var _mountRoutes_monitoring = function (app) {
    app.get('/_ah/health', function (req, res) {
        res.set('Content-Type', 'text/plain');
        res.status(200).send('ok');
    });
};
//
var _mountRoutes_ensureWWW = function (app) {
    app.use(function (req, res, next) {
        if (shouldEnsureWWW == false) {
            next();

            return;
        }
        var host = req.header("host");
        var protocol = req.header('x-forwarded-proto') == 'https' ? 'https' : 'http';
        if (host.match(/^www\..*/i)) {
            next();
        } else {
            return res.redirect(301, protocol + "://www." + host + req.originalUrl);

        }
    });
};
//
var _mountRoutes_errorHandling = function (app) {
    //
    // Add the error logger after all middleware and routes so that
    // it can log errors from the whole application. Any custom error
    // handlers should go after this.
    app.use(expressWinston.errorLogger({
        transports: [
            new winston.transports.Console({
                json: true,
                colorize: isDev
            })
        ]
    }));

    //
    app.use(function (req, res) { // 404 handler
        // TODO: render a view template?
        res.status(404).send('Not Found');
    });
    //
    app.use(function (err, req, res, next) { // Basic error handler
        // TODO: render a view template?
        res.status(500).send(err.response || 'Internal Server Error');
    });
};
//


var isNotRootDomain = function(subdomains) {
    
    if (subdomains.length == 1 && subdomains[0] !== 'www') { // pattern: subdomain.arrays.co
        return true;
    } else if (subdomains.length == 2 && subdomains[0] == 'www') { //pattern: subdomain.www.arrays.co
        return true;
    } else {
        return false;
    }

}

var rootDomain = process.env.USE_SSL === 'true' ? 'https://' : 'http://';
    rootDomain += process.env.HOST ? process.env.HOST : 'localhost:9080';


var urlRegexForDataset = /(\/[a-z_\d-]+)(-r\d)\/(gallery|bar-chart|chart|choropleth|timeline|word-cloud|scatterplot|line-graph|pie-set)/g;

var _mountRoutes_endPoints = function (app) {
    // View endpoints

    app.all('*',function(req,res,next) {

        if (isNotRootDomain(req.subdomains) && req.url!== '/' && !urlRegexForDataset.test(req.url)) {
            return res.redirect(rootDomain+req.url);
        } else {
            next();
        }
    })

    app.use('/', require('./homepage'));
    
    app.use('/array', require('./array'));
    app.use('/s', require('./shared_pages'));
    var apiVersion = 'v1';
    app.use('/' + apiVersion, require('./jsonAPI_share'));
    app.use('/auth', require('./auth'));
    app.use('/login', function(req, res) {
        res.redirect('/auth/login');
    });
    app.use('/signup',require('./signup'));

    app.use('/dashboard', require('./dashboard'));
    app.use('/api', require('./api'));
    app.use('/account',require('./account'));
    app.use('/', require('./views'));

    
};

module.exports.MountRoutes = function (app) {
    _mountRoutes_monitoring(app);
    //_mountRoutes_ensureWWW(app);
    _mountRoutes_endPoints(app);
    _mountRoutes_errorHandling(app);
};
