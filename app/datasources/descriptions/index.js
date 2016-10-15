var fs = require('fs');
var winston = require('winston');
var mongoose_client = require('../../../lib/mongoose_client/mongoose_client');
var datasource_description = require('../../models/datasource_descriptions');
var Promise = require('q').Promise;



module.exports =  {
    GetDescriptions : function(fn) {
        if (typeof fn == 'function') {
            mongoose_client.WhenMongoDBConnected(function () {
                datasource_description.find({$and:[{fe_visible:true},{schema_id:{$exists:false}}]})
                    .lean()
                    .exec(function(err,descriptions) {
                        if (err) {
                            winston.error("❌ Error occurred when finding datasource description: ", err);
                        } else {
                            fn(descriptions);
                        }

                    })

            })

        } else {
            // winston.error("❌ not passing function to GetDescriptions for callback ");

        }


    },

    GetDescriptionsToSetup : function(files,fn) {
        if (!files || files.length == 0)
            files = require('./default.js').Datasources;
        
        mongoose_client.WhenMongoDBConnected(function () {
            function asyncFunction (file, cb) {

                datasource_description.findOne({$or: [{uid:file},{dataset_uid:file}]})
                    .lean()
                    .pppulate('_otherSources')
                    .exec(function(err,description) {
                        if (err) {
                            winston.error("❌ Error occurred when finding datasource description: ", err);
                        } else {

                            console.log(description);

                           
                                // if (!description.schema_id) {
                                //     cb(description);
                                // } else {
                                //     var des = getSchemaDescriptionAndCombine(description.schema_id,description);
                                //     cb(des);

                            //     // }
                            // }
                        }
                    })
            }
            var requests = files.map((file) => {
                return new Promise((resolve) => {
                  asyncFunction(file, resolve);
                });
            });
            Promise.all(requests).then(function(data) {
        
                fn(data);
            });
        })





        var getSchemaDescriptionAndCombine = function(schemaId,desc) {
            return new Promise(function(resolve,reject) {
                 datasource_description.findOne({uid:schemaId})
                    .lean()
                    .exec(function(err,schemaDesc) {

                        for (var attrname in schemaDesc) {
                            if (desc[attrname]) {
                                if (Array.isArray(desc[attrname])) {
                                    desc[attrname] = schemaDesc[attrname].concat(desc[attrname]);
                                } else if (typeof desc[attrname] === 'string') {
                                    // Nothing to do
                                } else if (typeof desc[attrname] === 'object') {
                                    desc[attrname] = mergeObject(schemaDesc[attrname], desc[attrname]);
                                }
                            } else {
                                desc[attrname] = schemaDesc[attrname];
                            }
                        }
                        resolve(desc);

                    })


            }) 
        }

        var mergeObject = function(obj1,obj2) {
            var obj3 = {};
            for (var attrname in obj1) {
                obj3[attrname] = obj1[attrname]
            }
             for (var attrname in obj2) {
                obj3[attrname] = obj2[attrname];
            }
            return obj3;
        }

    }, 

    GetDescriptionsWith_uid_importRevision : function(uid,revision,fn) {


        datasource_description.findOne({uid: uid,importRevision: revision,fe_visible:true})
            .lean()
            .exec(function(err,descriptions) {
                if (err) {
                    winston.error("❌ Error occurred when finding datasource description with uid and importRevision ", err);
                } else {
                    fn(descriptions);
                }
            })

    }






}



