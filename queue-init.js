var cluster = require('cluster');
var datasource_description = require('./app/models/descriptions');

var kue = require('kue');
var nodemailer = require('./app/libs/utils/nodemailer');

var queue = kue.createQueue({
	redis: process.env.REDIS_URL
});






module.exports = function() {

	var _finishAllImportingSteps = function(dataset) {
		var user = dataset.lastImportInitiatedBy;
		var team = dataset._team;
		if (team == undefined && dataset.schema_id && dataset.schema_id._team) {
			team = dataset.schema_id._team;
			if (!user) {
				user = dataset.schema_id.lastImportInitiatedBy;
			}
		}
		
		nodemailer.sendVizFinishProcessingEmail(user,dataset,team,function(err) {
			if (err) console.log(err);
			dataset.jobId = 0;
			dataset.save();
		})
	}


	var _initJob = function(datasetId,jobName,cb) {

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

	var _initJobForAppendedDatasets = function(child,dirty,task) {

		child.forEach(function(dataset,index) {

		

            if (dirty == 1 || dataset.dirty == 1) {

                if (task == 'scrapeImages' || task == 'importProcessed') {

                    _initJob(dataset._id,'preImport',function(err) {
                        if (err) winston.error('❌ in initializing job preImport on child dataset');
                        return;
                    });
                }

            } else if (dirty == 2) {

                if (task == 'scrapeImages' || task == 'postImport' || task == 'importProcessed') {

                    _initJob(dataset._id,'importProcessed',function(err) {
                        if (err) winston.error('❌ in initializing job preImport on child dataset');
                        return;
                    });
                } 
            }
        })
	}

	var _initJobForMergedDatasets = function(jsonObj) {

		jsonObj.datasets.forEach(function(ds) {
            ds.dirty = 1;
            ds.save();

            _initJob(ds._id,'preImport',function(err) {
                if (err) winston.error('❌ in initializing job scrapeImages on job completion');
                return;
            });
        })

	}


	if (cluster.isMaster) {

		process.on('SIGTERM',function(sig) {
			queue.shutdown(5000, function(err) {
				console.log( 'Kue shutdown: ', err||'' );
	    		process.exit( 0 );
			})
		})

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


		            datasource_description.findById(job.data.id)
		            .populate('lastImportInitiatedBy _team schema_id schema_id._team')
		            .exec(function(err,dataset) {
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
		                        } else if (task == 'postImport' && dataset.skipImageScraping == false &&
		                        		dataset.fe_image && dataset.fe_image.field && (dirty == 1 || dirty == 2 ||
		                        			(dirty == 3 &&  (dataset.fe_image.scraped==false || dataset.fe_image.overwrite == true ) ))) {

		                            _initJob(job.data.id,'scrapeImages',function(err) {
		                                if (err) winston.error('❌ in initializing job importProcessed on job completion');
		                                return;
		                            });
		                        } else {

		                            datasource_description.datasetsNeedToReimport(dataset._id,function(err,jsonObj) {
		                                if (err) return;
		                                _finishAllImportingSteps(dataset);
		                                _initJobForMergedDatasets(jsonObj);
		                            })
		                        }

		                    } else {
		                    	dataset.jobId = 0;
								dataset.save();
		                        _initJobForAppendedDatasets(childrenDatasets,dirty,task);
		                    }
		                })
		            })
		        }
		    })
		})
	}


	return {
		initJob: _initJob,
		worker: queue
	};

}





