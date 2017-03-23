var kue = require('kue');


module.exports.getJob = function(req, res) {
    kue.Job.get(req.params.id, function (err, job) {
        if (err) console.log(err);
        return res.status(200).json(job)
    })
}

module.exports.getJobLog = function(req, res) {
    kue.Job.log(req.params.id, function (err, log) {
        if (err) console.log(err)
        return res.status(200).json(log)
    })
}

