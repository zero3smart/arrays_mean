var Batch = require('batch');
var winston = require('winston');
var queue = require.main.require('./queue-init')();
var kue = require('kue');
var raw_source_documents = require('../../models/raw_source_documents');
var datasource_description = require('../../models/descriptions');
var mongoose_client = require('../../models/mongoose_client');
var import_controller = require('../../libs/import/data_ingest/controller');
var raw_row_objects = require('../../models/raw_row_objects');
var postimport_caching_controller = require('../../libs/import/cache/controller');



queue.worker.process('preImport',function(job,done) {

    var id = job.data.id;

    var batch = new Batch();
    batch.concurrency(1);

    var description;

    batch.push(function (done) {

        datasource_description.findById(id)
        .lean()
        .deepPopulate('schema_id _team schema_id._team')
        .exec(function (err, data) {
                if (err) return done(err);
                if (!data) return done(new Error('No datasource exists : ' + uid));

                description = data;

                if (description.schema_id) { //merge with parent description
                    description = datasource_description.Consolidate_descriptions_hasSchema(description);
                }
                done();
            });
    });


    // Remove source document
    
    batch.push(function (done) {

        if (!description.schemaId) {

            raw_source_documents.Model.findOne({primaryKey: description._id}, function (err, document) {
                if (err) return done(err);
                if (!document) return done();

                winston.info("✅  Removed raw source document : " + description._id + ", error: " + err);
                document.remove(done);
                done();
            });
        } else {
            done();
        }
    });



    // Remove raw row object
    batch.push(function (done) {

        if (!description.schemaId) {

             mongoose_client.dropCollection('rawrowobjects-' + description._id, function (err) {
                // Consider that the collection might not exist since it's in the importing process.
                if (err && err.code != 26) return done(err);

                winston.info("✅  Removed raw row object : " + description._id + ", error: " + err);
                done();
            })

        } else {
            done();
        }

    });


    batch.end(function (err) {
        if (err) return done(err);
      

       import_controller.Import_rawObjects([description],job,function(err) {
            if (err) {
                console.log('err in queue processing preImport job: %s',err);
                return done(err);
            }
            done();
       })
    });


})


queue.worker.process('scrapeImages', function(job,done) {
    var id = job.data.id;

    var batch = new Batch();
    batch.concurrency(1);

    var description;
    var description_schemaId;
    batch.push(function(done) {
        datasource_description.findById(id)
        .lean()
        .deepPopulate('schema_id _team schema_id._team')
        .exec(function(err,data) {
            if (err) return done(err);
            if (!data) return done(new Error('No datasource exists : ' + uid));

            description = data;

             if (description.schema_id) { //merge with parent description
                description_schemaId = description.schema_id.id;
                description = datasource_description.Consolidate_descriptions_hasSchema(description);
            } 
            done();
        })
    })

    batch.push(function(done) {
        import_controller.Import_dataSourceDescriptions__enteringImageScrapingDirectly([description],job,function(err) {
            if (err) return done(err);
            done();
        })
    })

    batch.end(function(err) {

        if (!err) {

            var updateQuery =  {$set: {dirty:0,imported:true}};
            var multi = {multi: true};
            if (description.schema_id) {
                 datasource_description.update({$or: [{_id:id}, {_id: description_schemaId}]}, updateQuery,multi,done);

            } else {
                 datasource_description.update({$or: [{_id:id}, {_otherSources: id}]}, updateQuery,multi,done);

            }
           
            
        }

       

    })





})


queue.worker.process('importProcessed',function(job,done) {
    var id = job.data.id;

    // need to delete processed row object

    var batch = new Batch();
    batch.concurrency(1);

    var description;
    var hasSchema = false;


    // ----> consolidate if its child dataset


    batch.push(function (done) {

        datasource_description.findById(id)
        .lean()
        .deepPopulate('schema_id _team schema_id._team')
        .exec(function (err, data) {
            if (err) return done(err);
            if (!data) return done(new Error('No datasource exists : ' + uid));

            description = data;

             if (description.schema_id) { //merge with parent description
                hasSchema = true;
                description = datasource_description.Consolidate_descriptions_hasSchema(description);
            } 

            done();
        });
    });

 
    // --> remove processed row object

    batch.push(function (done) {
        if (!hasSchema) {

            mongoose_client.dropCollection('processedrowobjects-' + description._id, function (err) {
                // Consider that the collection might not exist since it's in the importing process.
                if (err && err.code != 26) return done(err);

                winston.info("✅  Removed processed row object : " + description._id + ", error: " + err);
                done();
            });

        } else {
            done();
        }
    });


    batch.push(function(done) {
        if (!hasSchema) { 
            var raw_row_objects_forThisDescription = raw_row_objects.Lazy_Shared_RawRowObject_MongooseContext(description._id).forThisDataSource_RawRowObject_model
            raw_row_objects_forThisDescription.count(function(err,numberOfDocs) {
                if (err) return done(err);

                raw_source_documents.Model.update({primaryKey: description._id},{$set: {numberOfRows: numberOfDocs}},function(err) {
                     winston.info("✅  Updated raw source document number of rows to the raw doc count : " + description._id);
                    done(err);
                })
            })

        } else {
            done();
        }
    })

    batch.end(function (err) {
        if (err) return done(err);

        import_controller.PostProcessRawObjects([description],job,function(err) {
             if (err) {
                console.log('err in queue processing import processed job : %s',err);
                return done(err);
            }
            done();
        })
    });

})

queue.worker.process('postImport',function(job,done) {
    var id = job.data.id;
    var description;

    var description_schemaId;

    var batch = new Batch();
    batch.concurrency(1);

    batch.push(function(done) {
         datasource_description.findById(id)
        .lean()
        .deepPopulate('schema_id _team schema_id._team')
        .exec(function (err, data) {
            if (err) return done(err);
            if (!data) return done(new Error('No datasource exists : ' + uid));

            description = data;

             if (description.schema_id) { //merge with parent description
                description_schemaId = description.schema_id._id;
                description = datasource_description.Consolidate_descriptions_hasSchema(description);
            }
            done();
        });
    })


    batch.push(function(done) {
        postimport_caching_controller.GeneratePostImportCaches([description],job,done);
    })

    batch.push(function(done) {

        var updateQuery;


        if (description.fe_image && description.fe_image.field && description.fe_image.scraped == false) { //need to scrape, dont update dirty now
            updateQuery =  {$set: {imported:true}};
        } else { //last step, can update dirty now
            updateQuery =  {$set: {dirty:0,imported:true}};
        }
        var multi = {multi: true};
        if (description_schemaId) { //update parent 
            datasource_description.update({$or: [{_id:id}, {_id: description_schemaId}]}, updateQuery,multi,done);

        } else {
            datasource_description.update({$or:[{_id:id}, {_otherSources:id}]}, updateQuery, multi,done);

        }
    })

    batch.end(function(err) {
         if (err) {
            console.log('err in queue updating post import caches : %s',err);
            return done(err);
        } else {
            done(null);
        }

    })
})