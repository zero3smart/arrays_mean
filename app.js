
var cluster = require('cluster');



if (cluster.isMaster) {

    require('./queue-init')();


    var clusterWorkerSize = process.env.WEB_CONCURRENCY || require('os').cpus().length;


    console.log('master pid %s, total Workers: %s ', process.pid,clusterWorkerSize);
    for (var i = 0; i < clusterWorkerSize; i ++) {
        cluster.fork();
    }

    cluster.on('exit',function(worker_process) {
        if (cluster.worker) {
            console.log("Worker %d died pid %d",cluster.worker.id,process.pid);
        } else {
            console.log("no worker available");
        }
    })

} else {

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
    var async = require('async');


    var isDev = process.env.NODE_ENV == 'production' ? false : true;
    var dotenv_path = __dirname + "/config/env/.env." + (process.env.NODE_ENV ? process.env.NODE_ENV : "development");
    dotenv.config({
        path: dotenv_path,
        silent: true
    });



    var app = express();


    //job queue user interface
    if (process.env.NODE_ENV !== 'production') {
        var kue = require('kue');
        var ui = require('kue-ui');
            kue.createQueue({
            redis: process.env.REDIS_URL
        })
        ui.setup({
            apiURL: '/api',
            baseURL: '/kue',
            updateInterval: 5000
        })

        app.use('/api',kue.app);
        app.use('/kui',ui.app);

    }




    require('./config/setup-passport');


    var userFolderPath = __dirname + "/user";

    var viewsToSet = [];

    viewsToSet.push(__dirname + '/views');

    var nunjucks = require('express-nunjucks');
    app.set('view engine', 'html');

    if (isDev) {
        app.set('subdomain offset',3);
    }

    fs.readdir(userFolderPath, function (err, files) {


        if (!files) {
            app.set('views', viewsToSet)
            nunjucks.setup({
                watch: isDev,
                noCache: isDev,
            }, app).then(function(nunjucks_env) {
                require('./nunjucks/filters')(nunjucks_env,process.env)
            });
            return;
        }

        files = files.filter(function (item) {
            return !(/(^|\/)\.[^\/\.]/g).test(item);
        })

        async.each(files, function (file, eachCb) {
            var full_path = path.join(userFolderPath, file);
            var team_name = file;
            fs.stat(full_path, function (err, stat) {
                if (err) {
                    eachCb(err)
                } else {
                    if (stat.isDirectory() && files) {
                        var view_path = path.join(userFolderPath, file + "/views");
                        viewsToSet.push(view_path);

                        //serving static files for custom views
                        app.use('/static', express.static(path.join(userFolderPath, team_name + "/static")));

                    }
                    eachCb();
                }
            })
        }, function (err) {
            if (err)  return winston.error("❌ cannot sync the user folder files :", err);
            app.set('views', viewsToSet)
            nunjucks.setup({
                watch: isDev,
                noCache: isDev,
            }, app).then(function(nunjucks_env) {
                require('./nunjucks/filters')(nunjucks_env,process.env)
            });

        })
    })

    app.use(cors());

    app.use(require('serve-favicon')(__dirname + '/public/images/favicon.ico'));
    app.use(express.static(path.join(__dirname, '/public')));


    // Redirect https
    app.use(function (req, res, next) {
        if (process.env.USE_SSL === 'true' && 'https' !== req.header('x-forwarded-proto')) {
            return res.redirect('https://' + req.header('host') + req.url);
        }
        next();
    });


    var routes = require('./app/routes');


    app.use(bodyParser.urlencoded({extended: false})); // application/x-www-form-urlencoded
    app.use(bodyParser.json()); // application/JSON
    app.use(require('compression')());
    app.set('trust proxy', true);
    app.use(cookieParser());


    var domain = 'localhost';



    if (process.env.HOST) {
        var urlParts = process.env.HOST.split('.');
        urlParts.splice(0, urlParts.length-2);
        // Remove port
        urlParts[urlParts.length-1] = urlParts[urlParts.length-1].split(':')[0];
        domain = '.' + urlParts.join('.');
    }

    // Mongo Store to prevent a warnning.
    app.use(session({
        secret: process.env.SESSION_SECRET,
        resave: true,
        saveUninitialized: true,
        cookie: {domain: domain},
        store: new MongoSessionStore({
            url: process.env.MONGODB_URI ? process.env.MONGODB_URI : 'mongodb://localhost/arraysdb',
            // touchAfter: 240 * 3600 // time period in seconds
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
    var mongoose_client = require('./app/models/mongoose_client');
    var raw_source_documents = require('./app/models/raw_source_documents');
    var datasource_descriptions = require('./app/models/descriptions');


    if (typeof process === 'object') { /* to debug promise */
        process.on('unhandledRejection', function (error, promise) {
            console.error("== Node detected an unhandled rejection! ==");
            console.error(error.stack);
        });
    }

    var modelNames = [raw_source_documents.ModelName];
    mongoose_client.FromApp_Init_IndexesMustBeBuiltForSchemaWithModelsNamed(modelNames)

    mongoose_client.WhenMongoDBConnected(function () {
        mongoose_client.WhenIndexesHaveBeenBuilt(function () {

            // winston.info("💬  Proceeding to boot app. ");
            //
            routes.MountRoutes(app);
            //
            // Run actual server
            if (module === require.main) {
                var server = app.listen(process.env.PORT || 9080, function () {
                    var host = isDev ? 'localhost' : server.address().address;
                    var port = server.address().port;
                    // winston.info('📡  App listening at %s:%s', host, port);
                    winston.info("💬   Worker %d running pid %d",cluster.worker.id,process.pid);
                });
            }
        });
    });




}


