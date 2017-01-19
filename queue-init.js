var kue = require('kue');
var cluster = require('cluster');

var queue = kue.createQueue({
    redis: process.env.REDIS_URL
});




function _initJob(datasetId,jobName,cb) {


    var job = queue.create(jobName, {
        id: datasetId
    }).ttl(9000000)
    .save(function(err) {
        if (err) return cb(err);
        else {

            datasource_description.findOneAndUpdate({_id: datasetId},{$set:{jobId: job.id}},{new: true},function(err,updatedDataset) {
                if (err) return cb(err);
                else {
                    return cb(null,updatedDataset.jobId);
                }
            });
        }
    })
}

module.exports.initJob = _initJob

var datasource_description = require('./app/models/descriptions');


if (cluster.isMaster) {


	queue.on('job enqueue',function(id,type) {

	   console.log('Job %s got enqueued of type %s',id,type);

	}).on('job complete',function(id,result) {

	    console.log('Job %s completed with result %s', id, JSON.stringify(result));

	    kue.Job.get(id,function(err,job) {
	        if (err) return;
	        var task = job.type;

	        if (task == 'preImport') {

	            _initJob(job.data.id,'importProcessed',function(err) {
	                if (err) winston.error('❌ in initializing job importProcessed on job completion');
	                return;
	            })

	        } else { // importProcessed || postImport || scrapeImages

	            datasource_description.findById(job.data.id,function(err,dataset) {
	                if (err || !dataset) return;

	                var dirty = dataset.dirty;

	                datasource_description.find({schema_id: job.data.id},function(err,childrenDatasets) {
	                    if (err) return;
	                    if (childrenDatasets.length == 0) {

	                        if (task == 'importProcessed') {
	                            _initJob(job.data.id,'postImport',function(err) {
	                                if (err) winston.error('❌ in initializing job importProcessed on job completion');
	                                return;
	                            });
	                        } else if (task == 'postImport' && dataset.skipImageScraping == false) {

	                             _initJob(job.data.id,'scrapeImages',function(err) {
	                                if (err) winston.error('❌ in initializing job importProcessed on job completion');
	                                return;
	                            });
	                        } else {

	                            datasource_description.datasetsNeedToReimport(dataset._id,dataset.uid,dataset.importRevision,function(err,jsonObj) {
	                                if (err) return;
	                                dataset.jobId = 0;
	                                dataset.save();

	                                
	                                jsonObj.datasets.forEach(function(ds) {
	                                    
	                                    ds.dirty = 1;
	                                    ds.save();

	                                    _initJob(ds.id,'preImport',function(err) {
	                                        if (err) winston.error('❌ in initializing job scrapeImages on job completion');
	                                        return;
	                                    });
	                                })
	                                
	                            })
	                        }

	                    } else {
	                        dataset.jobId = 0;
	                        dataset.save();
	                        
	                        childrenDatasets.forEach(function(dataset,index) {

	                            if (dirty == 1) {

	                                if (task == 'scrapeImages' || task == 'importProcessed') {

	                                    _initJob(dataset.id,'preImport',function(err) {
	                                        if (err) winston.error('❌ in initializing job preImport on child dataset');
	                                        return;
	                                    });
	                                }

	                               
	                            } else if (dirty == 2) {

	                                if (task == 'scrapeImages' || task == 'postImport' || task == 'importProcessed') {

	                                    _initJob(dataset.id,'importProcessed',function(err) {
	                                        if (err) winston.error('❌ in initializing job preImport on child dataset');
	                                        return;
	                                    });

	                                } 
	                            }
	                        })

	                    }
	                })

	            })
	        }

	    })
	})





}


