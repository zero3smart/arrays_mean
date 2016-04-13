//
//
// Constants
var isDev = process.env.NODE_ENV == 'development' ? true : false;
//
//
//
// Initialize application object for context
//
require('dotenv').config();
var path = require('path');
var express = require('express');
var winston = require('winston');
var app = express();
//
//
// Set up application runtime object graph
//
var context = require('./app_context').NewHydratedContext(app);
module.exports = context; // access app at context.app
//
//
// Configure app
//
app.set('view engine', 'html');
app.set('views', __dirname + '/views');
var nunjucks = require('express-nunjucks');
var nunjucks_config = 
{
    watch: isDev,
    noCache: isDev,
};
nunjucks.setup(nunjucks_config, app).then(function(nunjucks_env)
{
    nunjucks_env.addFilter('comma', require('nunjucks-comma-filter'));
});
//
app.use(context.logging.requestLogger);
app.use(require('serve-favicon')(__dirname + '/public/images/favicon.ico'));
app.use(express.static(path.join(__dirname, '/public')));
var bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extended: false })); // application/x-www-form-urlencoded
app.use(bodyParser.json()); // application/JSON
app.use(require('compression')());
app.set('trust proxy', true);
var helmet = require('helmet');
app.use(helmet.xframe());
//
//
var mongoose_client = require('../mongoose_client/mongoose_client');
var modelNames = [];
modelNames.push(context.raw_source_documents_controller.ModelName);
mongoose_client.FromApp_Init_IndexesMustBeBuiltForSchemaWithModelsNamed(modelNames)
//
mongoose_client.WhenMongoDBConnected(function() 
{
    mongoose_client.WhenIndexesHaveBeenBuilt(function() 
    {
        _mountRoutesAndStartListening();
    });
});
//
function _mountRoutesAndStartListening()
{
    winston.info("💬  Proceeding to boot app.");
    
    context.routes_controller.MountRoutes();
    //
    // Run actual server
    if (module === require.main) {
        var server = app.listen(process.env.PORT || 9080, function () {
            var host = isDev ? 'localhost' : server.address().address;
            var port = server.address().port;
            winston.info('📡  App listening at %s:%s', host, port);
        });
    }
}

