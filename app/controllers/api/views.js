var View = require('../../models/views');



module.exports.index = function (req, res) {
	View.find({})
	.select('_id name displayAs icon')
	.exec(function(err,views) {
		if (err) {
			res.send(err);
		} else {
			// console.log(views);
			res.json(views);
		}
	})
    
};

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


