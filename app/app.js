var path = require('path');
var express = require('express');
var winston = require('winston');
var expressWinston = require('express-winston');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var session = require('express-session');
var MongoSessionStore = require('connect-mongo')(session);
var flash = require('connect-flash');
var passport = require('passport');
var dotenv = require('dotenv');
var fs = require('fs');
var routes = require('./routes');

var isDev = process.env.NODE_ENV == 'production' ? false : true;
var dotenv_path = __dirname + "/../config/env/.env." + (process.env.NODE_ENV ? process.env.NODE_ENV : "development");
dotenv.config({
    path: dotenv_path,
    silent: true
});

var strategy = require('./setup-passport');

var app = express();

// Configure app
app.set('view engine', 'html');
app.set('views', __dirname + '/views');
var nunjucks = require('express-nunjucks');
nunjucks.setup({
    watch: isDev,
    noCache: isDev,
}, app).then(require('./nunjucks/filters'));

// Redirect https
app.use(function(req, res, next){
    if (process.env.USE_SSL === true && 'https' !== req.header('x-forwarded-proto')){
        res.redirect('https://'+req.header('host')+req.url);
    }

    next();
});

//
app.use(require('serve-favicon')(__dirname + '/public/images/favicon.ico'));
app.use(express.static(path.join(__dirname, '/public')));
app.use(bodyParser.urlencoded({ extended: false })); // application/x-www-form-urlencoded
app.use(bodyParser.json()); // application/JSON
app.use(require('compression')());
app.set('trust proxy', true);
app.use(require('helmet').xframe());
app.use(cookieParser());

// Mongo Store
var dbName = process.env.MONGODB_DBNAME;
var dbURI = process.env.MONGODB_URI;
if (!dbURI) dbURI = 'mongodb://localhost/';
dbURI = dbURI + dbName;

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: true,
    saveUninitialized: true,
    cookie: {maxAge: 100*60*60},
    store: new MongoSessionStore({
        url: dbURI,
        touchAfter: 24 * 3600 // time period in seconds
    })
}));

app.use(flash());
app.use(passport.initialize());
app.use(passport.session());

// Logger
app.use(expressWinston.logger({
    transports: [
        new winston.transports.Console({
            json: false,
            colorize: isDev
        })
    ],
    expressFormat: true,
    meta: false
}));
//
//
var mongoose_client = require('../lib/mongoose_client/mongoose_client');
var raw_source_documents = require('./models/raw_source_documents');
var modelNames = [raw_source_documents.ModelName];
mongoose_client.FromApp_Init_IndexesMustBeBuiltForSchemaWithModelsNamed(modelNames)
//
mongoose_client.WhenMongoDBConnected(function() 
{
    mongoose_client.WhenIndexesHaveBeenBuilt(function() 
    {
        winston.info("💬  Proceeding to boot app.");
        //
        routes.MountRoutes(app);
        //
        // Run actual server
        if (module === require.main) {
            var server = app.listen(process.env.PORT || 9080, function () {
                var host = isDev ? 'localhost' : server.address().address;
                var port = server.address().port;
                winston.info('📡  App listening at %s:%s', host, port);
            });
        }
    });
});

module.exports = app;