var mongoose_client = require('../../lib/mongoose_client/mongoose_client');
var integerValidator = require('mongoose-integer');


var mongoose = mongoose_client.mongoose;
var Schema = mongoose.Schema;
//
var team_scheme = Schema({
    title: String,
    tid: String,
    description: String,
    logo: String,
    logoHeader: String,
    datasourceDescriptions: [{type:Schema.Types.ObjectId, ref: 'DatasourceDescription'}]
    
});


var modelName = 'Team';
team_scheme.plugin(integerValidator);

var team = mongoose.model(modelName, team_scheme);
module.exports = team

