var mongoose_client = require('../../lib/mongoose_client/mongoose_client');
var mongoose = mongoose_client.mongoose;
var Schema = mongoose.Schema;
var View_scheme = Schema({
    name: String,
    settings: Array,
    displayAs: String,
    icon: String
});
var modelName = 'View';
module.exports = mongoose.model(modelName, View_scheme);