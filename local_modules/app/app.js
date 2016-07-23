//
//
// Constants
var isDev = process.env.NODE_ENV == 'development' ? true : false;
//
//
//
// Initialize application object for context
//
var dotenv_path = __dirname + "/../../.env." + process.env.NODE_ENV;
var dotenv_config =
{
    path: dotenv_path
};
require('dotenv').config(dotenv_config);
var path = require('path');
var express = require('express');
var winston = require('winston');
var moment = require("moment"); 
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
    // General/shared
    nunjucks_env.addFilter('dateFormattedAs_monthDayYear', function(date)
    {
        return moment(date).format("MMMM Do, YYYY");
    });
    nunjucks_env.addFilter('dateFormat', function(date, format)
    {
        return format !== null ? moment(date).format(format) : moment(date).format("MMMM Do, YYYY");
    });
    nunjucks_env.addFilter('isArray', function(val) 
    {
        return Array.isArray(val);
    });
    nunjucks_env.addFilter('doesArrayContain', function(array, member)
    {
        return array.indexOf(member) !== -1;
    });
    nunjucks_env.addFilter('isObjectEmpty', function(obj) 
    {
        return Object.keys(obj).length === 0;
    });
    nunjucks_env.addFilter('alphaSortedArray', function(array) 
    {
        return array.sort();
    });
    nunjucks_env.addFilter('jsonStringify', function(obj)
    {
        return JSON.stringify(obj);
    });
    // Array views - Filter obj construction
    nunjucks_env.addFilter('constructedFilterObj', function(existing_filterObj, this_filterCol, this_filterVal, isThisAnActiveFilter) 
    {
        var filterObj = {};
        var existing_filterCols = Object.keys(existing_filterObj);
        var existing_filterCols_length = existing_filterCols.length;
        for (var i = 0 ; i < existing_filterCols_length ; i++) {
            var existing_filterCol = existing_filterCols[i];
            if (existing_filterCol == this_filterCol) { 
                continue; // never push other active values of this is filter col is already active
                // which means we never allow more than one filter on the same column at present
            }
            var existing_filterVals = existing_filterObj[existing_filterCol];
            //
            var filterVals = [];
            //
            var existing_filterVals_length = existing_filterVals.length;
            for (var j = 0 ; j < existing_filterVals_length ; j++) {
                var existing_filterVal = existing_filterVals[j];
                var encoded_existing_filterVal = typeof existing_filterVal === 'string' ? encodeURIComponent(existing_filterVal) : existing_filterVal;
                filterVals.push(encoded_existing_filterVal); 
            }
            //
            if (filterVals.length !== 0) {
                filterObj[existing_filterCol] = filterVals; // as it's not set yet
            }
        }
        //
        if (isThisAnActiveFilter === false) { // do not push if active, since we'd want the effect of unsetting it
            var filterVals = filterObj[this_filterCol] || [];
            if (filterVals.indexOf(filterVal) == -1) {
                var filterIsString = typeof this_filterVal === 'string';
                var filterVal = filterIsString ? encodeURIComponent(this_filterVal) : this_filterVal;
                filterVals.push(filterVal);
            }
            filterObj[this_filterCol] = filterVals; // in case it's not set yet
        }
        //
        return filterObj;
    });
    // Array views - Filter value to display
    nunjucks_env.addFilter('filterValToDisplay', function(filterVal){
        if (typeof filterVal === 'string')
            return decodeURIComponent(filterVal);
        var output = '';
        if (!isNaN(filterVal.min))
            output = filterVal.min;
        else if (filterVal.min !== null)
            output = output + moment(filterVal.min).format("MMMM Do, YYYY");
        output = output + ' – ';
        if (!isNaN(filterVal.max))
            output = output + filterVal.max;
        else if (filterVal.max !== null)
            output = output + moment(filterVal.max).format("MMMM Do, YYYY");
        return output;
    });
});
//
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
    //
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
//