var mongoose_client = require('./mongoose_client');
var mongoose = mongoose_client.mongoose;
var Schema = mongoose.Schema;
var View_scheme = Schema({
    name: String,
    settings: Array,
    displayAs: String,
    icon: String
    // _team: {type: Schema.Types.ObjectId, ref: 'Team'}
});

var view = mongoose.model('View', View_scheme);
var Team = require('./teams');


view.getAllBuiltInViews = function(fn) {
	view.find({})
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
	var customViews = [];
	Team.find({isEnterprise: true},{subdomain:1})
	.exec(function(err,allEnterprise) {
		if (allEnterprise) {
			allEnterprise.map(function(team) {
				customViews.push(team.subdomain);
			})
		}
		fn(err,customViews);

	})

	// var customViews = ["atlas","insight","rhodiumgroup"];
	// fn(null,customViews);
}

module.exports = view;