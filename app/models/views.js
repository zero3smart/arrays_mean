var mongoose_client = require('./mongoose_client');
var mongoose = mongoose_client.mongoose;
var Schema = mongoose.Schema;
var View_scheme = Schema({
    name: String,
    settings: Array,
    displayAs: String,
    icon: String,
    _team: {type:Schema.Types.ObjectId, ref: 'Team'}
});

module.exports = mongoose.model('View', View_scheme);