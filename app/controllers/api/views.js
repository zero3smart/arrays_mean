var View = require('../../models/views');
var User = require('../../models/users');



module.exports.getAll = function (req, res) {
	View.find({})
	.select('_id name displayAs icon')
	.exec(function(err,views) {
		if (err) {
			res.send(err);
		} else {
			res.json(views);
		}
	})
};

module.export.getCustomViews = function(req,res) {

}

module.exports.getDefaultViews = function(req,res) {
	
}

module.exports.get = function(req,res) {
	View.findById(req.params.id)
	.exec(function(err,views) {
		if (err) {
			res.send(err);
		} else {
			res.json(views);
		}
	})
}


