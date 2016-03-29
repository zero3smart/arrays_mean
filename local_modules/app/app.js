//
//
// Initialize application object for context
//
const path = require('path');
const express = require('express');
const winston = require('winston');
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
const nunjucks = require('express-nunjucks');
nunjucks.setup({
    // (default: true) controls if output with dangerous characters are escaped automatically.
    autoescape: true,
    // (default: false) throw errors when outputting a null/undefined value.
    throwOnUndefined: false,
    // (default: false) automatically remove trailing newlines from a block/tag.
    trimBlocks: false,
    // (default: false) automatically remove leading whitespace from a block/tag.
    lstripBlocks: false,
    // (default: false) if true, the system will automatically update templates when they are changed on the filesystem.
    watch: true,
    // (default: false) if true, the system will avoid using a cache and templates will be recompiled every single time.
    noCache: true,
    // (default: see nunjucks syntax) defines the syntax for nunjucks tags.
    tags: {}
}, app);
app.use(context.logging.requestLogger);
app.use(require('serve-favicon')(__dirname + '/public/images/favicon.ico'));
app.use(express.static(path.join(__dirname, '/public')));
const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extended: false })); // application/x-www-form-urlencoded
app.use(bodyParser.json()); // application/JSON
app.use(require('compression')());
app.set('trust proxy', true);
const helmet = require('helmet');
app.use(helmet.xframe());
//
//
const mongoose_client = require('../mongoose_client/mongoose_client');
var modelNames = []
modelNames.push(context.raw_source_documents_controller.ModelName)
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
    // TODO: Integrate SSL/HTTPS
    if (module === require.main) {
        var server = app.listen(process.env.PORT || 9080, function () {
            var host = process.env.NODE_ENV == 'development' ? 'localhost' : server.address().address;
            var port = server.address().port;
            winston.info('📡  App listening at http://%s:%s', host, port);
        });
    }
}

