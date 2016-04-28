//
//
var dotenv_path = __dirname + "/../../.env." + process.env.NODE_ENV;
var dotenv_config =
{
    path: dotenv_path
};
require('dotenv').config(dotenv_config);
//
var asker = require('./MoMA_canned_questions_asker');
asker.Ask(function(err, results)
{
    if (err) {
        process.exit(1);
    }
    
    process.exit(0);
});