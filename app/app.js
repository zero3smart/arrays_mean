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
var cors = require('cors');
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
app.use(function (req, res, next) {
    if (process.env.USE_SSL === 'true' && 'https' !== req.header('x-forwarded-proto')) {
        return res.redirect('https://' + req.header('host') + req.url);
    }

    next();
});

//
app.use(require('serve-favicon')(__dirname + '/public/images/favicon.ico'));
app.use(express.static(path.join(__dirname, '/public')));
app.use(bodyParser.urlencoded({extended: false})); // application/x-www-form-urlencoded
app.use(bodyParser.json()); // application/JSON
app.use(require('compression')());
app.set('trust proxy', true);
app.use(cookieParser());
app.use(cors());

// Mongo Store to prevent a warnning.
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: true,
    saveUninitialized: true,
    cookie: {maxAge: 100 * 60 * 60},
    store: new MongoSessionStore({
        url: process.env.MONGODB_URI ? process.env.MONGODB_URI : 'mongodb://localhost/arraysdb',
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
var datasource_descriptions = require('./datasources/descriptions');




if (typeof process === 'object') { /* to debug promise */
    process.on('unhandledRejection', function(error, promise) {
        console.error("== Node detected an unhandled rejection! ==");
        console.error(error.stack);
    });
}

var modelNames = [raw_source_documents.ModelName];
mongoose_client.FromApp_Init_IndexesMustBeBuiltForSchemaWithModelsNamed(modelNames)

mongoose_client.WhenMongoDBConnected(function() 
{
    mongoose_client.WhenIndexesHaveBeenBuilt(function() 
    {

        winston.info("💬  ready to find all source descriptions and seed the DB");

        datasource_descriptions.findAllDescriptionAndSetup(function(err) {
            if (err) {
                winston.error("❌ cannot find descriptions in db and set them up");
            } else {
                winston.info("✅ all datasources descriptions in db has been set up");

            }

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
        })
    });
});

module.exports = app;