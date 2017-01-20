var mongoose_client = require('./mongoose_client');
var mongoose = mongoose_client.mongoose;
var Schema = mongoose.Schema;
var View_scheme = Schema({
    name: String,
    settings: Array,
    displayAs: String,
    icon: String,
    _team: {type: Schema.Types.ObjectId, ref: 'Team'}
});

var view = mongoose.model('View', View_scheme);


view.getAllBuiltInViews = function(fn) {
	view.find({_team: {$exists: false}})
	.select({_id:0,name:1})
	.exec(function(err,builtInViews) {
		if (err) {
			fn(err);
		} else {
			builtInViews.map(function(view) {
				view.name = view.name.replace(/([A-Z])/g, ' $1').trim().toLowerCase().replace(' ','-');
			})
			fn(null,builtInViews);
		}
	})
}

view.getAllCustomViews = function(fn) {
	view.find({_team: {$exists: true}})
	.select({_id:0,name:1})
	.exec(function(err,customViews) {
		if (err) {
			fn(err);
		} else {
			fn(null,customViews);
		}
	})
}

module.exports = view;