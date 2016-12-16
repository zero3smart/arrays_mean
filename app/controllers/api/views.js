var View = require('../../models/views');



module.exports.getAll = function (req, res) {
	View.find({})
	.select('_id name displayAs icon')
	.exec(function(err,views) {
		if (err) {
			res.status(500).send({error: err.message});
		} else {
			res.json(views);
		}
	})
    
};

module.exports.getAllBuiltInViews = function(req,res) {
	View.find({_team: {$exists: false}},function(err,builtInViews) {
		if (err) {
			res.status(500).send({error: err.message});
		} else {
			res.json(builtInViews);
		}
	})
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

function getAllViewsWithQuery(query, res) {
    View.find(query, {
        _id: 1,
        name: 1,
        displayAs: 1,
        icon: 1
    })
    .populate('_team')
    .exec(function (err, views) {
        if (err) {
            return res.json({error: err.message});
        }
        return res.json({datasets: views});
    })

}



