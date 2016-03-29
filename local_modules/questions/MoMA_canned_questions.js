//
//
const asker = require('./MoMA_canned_questions_asker');
asker.Ask(function(err, results)
{
    if (err) {
        process.exit(1);
    }
    
    process.exit(0);
})