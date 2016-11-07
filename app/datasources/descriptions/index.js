var fs = require('fs');
var winston = require('winston');
var mongoose_client = require('../../../lib/mongoose_client/mongoose_client');
require('../../models/teams')
var datasource_description = require('../../models/descriptions');

var Promise = require('q').Promise;
var _ = require("lodash");
var async = require('async');

var imported_data_preparation = require('.././utils/imported_data_preparation');
var import_controller = require('../.././controllers/pre_process/data_ingest/import_controller');

/* -----------   helper function ----------- */
var mergeObject = function (obj1, obj2) {
    var obj3 = {};
    for (var attrname in obj1) {
        obj3[attrname] = obj1[attrname]
    }
    for (var attrname in obj2) {
        obj3[attrname] = obj2[attrname];
    }
    return obj3;
}

var _consolidate_descriptions_hasSchema = function(description) {
    var desc = _.omit(description,['schema_id'])
    var schemaDesc = description.schema_id
    for (var attrname in schemaDesc) {
        if (desc[attrname]) {
            if (Array.isArray(desc[attrname])) {
                desc[attrname] = schemaDesc[attrname].concat(desc[attrname]);

            } else if (typeof desc[attrname] == 'string') {

            } else if (typeof desc[attrname] == 'object') {
                desc[attrname] = mergeObject(schemaDesc[attrname], desc[attrname]);

            }
        } else {
            desc[attrname] = schemaDesc[attrname]
        }
    }
    return desc;
}





/* -------   end helper function ------------  */
var GetDescriptions = function (fn) {

    mongoose_client.WhenMongoDBConnected(function () {

        datasource_description.find({
                fe_visible: true,
                schema_id: {$exists: false},
                _team: {$exists: false}
            }) /*dont get the one in the team, as it is gonna get from team descriptions */
            .lean()
            .exec(function (err, descriptions) {

                if (err) {
                    winston.error("❌ Error occurred when finding datasource description: ", err);
                    fn(err, null);
                } else {
                    fn(null, descriptions);

                }

            })

    })

}





module.exports.GetDescriptions = GetDescriptions




var _GetDescriptionsToSetupByFilenames = function (files, fn) {

    var descriptions = [];

    mongoose_client.WhenMongoDBConnected(function () {
        function asyncFunction(file, cb) {

            datasource_description.findOne({$or: [{uid: file}, {dataset_uid: file}]})
                .lean()
                .deepPopulate('_otherSources schema_id _team _otherSources._team')
                .exec(function (err, description) {

                    if (err) {
                        winston.error("❌ Error occurred when finding datasource description: ", err);
                    } else {

                        if (description._otherSources) {
                            var omitted = _.omit(description, ["_otherSources"]);
                            descriptions.push(omitted);
                            _.map(description._otherSources, function (src) {
                                var excludeOtherSource = _.omit(src, ["_otherSources"])
                                descriptions.push(excludeOtherSource);
                            })
                            cb();

                        } else if (!description.schema_id) {
                            descriptions.push(description);
                            cb();

                        } else {
                            descriptions.push(_consolidate_descriptions_hasSchema(description));
                            cb();
                        }
                    }
                })
        }

        var requests = files.map(function (file) {
            return new Promise(function (resolve) {
                asyncFunction(file, resolve);
            });
        });

        Promise.all(requests).then(function () {
            fn(descriptions);
        });
    })
}

module.exports.GetDescriptionsToSetup = _GetDescriptionsToSetupByFilenames


var _findAllDescriptionAndSetup = function (fn) {

    // TODO: Detect the datasources to be setup
    datasource_description.find({imported: 3})
        .lean()
        .deepPopulate('schema_id _team')
        .exec(function (err, descriptions) {

            async.each(descriptions, function (desc, eachCb) {

                var keyname;
              

                if (typeof desc.schema_id !== 'undefined') {

                    
                        desc = _consolidate_descriptions_hasSchema(desc);
                     

                        keyname = imported_data_preparation.DataSourcePKeyFromDataSourceDescription(desc).toLowerCase();

                        /*  special check for datasets that uses a schema since multiple datasets stored in same mongo collections  */
                        mongoose_client.checkIfDatasetImportedInSchemaCollection('rawrowobjects-' + keyname, desc.dataset_uid, function (err, existInRaw) {

                            if (err) {
                                winston.error("❌ err when checking mongo collection exists, from callback ");
                                eachCb(err);

                            } else {
                                if (existInRaw == true) {
                                    winston.info("✅ rawrowobjects collection exists for dataset_uid: ", desc.dataset_uid);
                                    mongoose_client.checkIfDatasetImportedInSchemaCollection('processedrowobjects-' + keyname, desc.dataset_uid, function (err, existInProcessed) {
                                        if (err) {
                                            eachCb(err);
                                        } else if (existInProcessed == true) {
                                            winston.info("✅ processedrowobjects collection exists for dataset_uid: ", desc.dataset_uid);
                                            eachCb(null);
                                        } else {
                                            winston.info("❗ processedrowobjects collection does not exists for dataset_uid: ", desc.dataset_uid);
                                            winston.info("💬  will build it right now....");

                                            var descriptions = [];

                                            import_controller.PostProcessRawObjects([desc], function () {
                                                eachCb(null);
                                            })
                                        }
                                    })
                                } else {
                                    winston.info("❗ rawrowobjects collection does not exists for dataset_uid: ", desc.dataset_uid);
                                    winston.info("💬  will build it right now....");
                                    import_controller.Import_dataSourceDescriptions([desc], function () {
                                        eachCb(null);
                                    });
                                }
                            }
                        })

                    
                } else {
                    keyname = imported_data_preparation.DataSourcePKeyFromDataSourceDescription(desc).toLowerCase();

                    mongoose_client.checkIfCollectionExists('rawrowobjects-' + keyname, function (err, exist) {
                        if (err) {
                            winston.error("❌ err when checking mongo collection exists, from callback ");
                            eachCb(err);

                        } else {
                            if (exist == true) {
                                winston.info("✅  rawrowobjects collection exists for dataset : ", keyname);
                                mongoose_client.checkIfCollectionExists('processedrowobjects-' + keyname, function (err, exist) {
                                    if (err) {
                                        eachCb(err);
                                    } else if (exist == true) {
                                        winston.info("✅  processedrowobjects collection exists for dataset: ", keyname);
                                        eachCb(null);

                                    } else {
                                        winston.info("❗ processedrowobjects collection does not exists for dataset: " + keyname);
                                        winston.info("💬  will build it right now....");

                                        var descriptions = [];

                                        import_controller.PostProcessRawObjects([desc], function () {
                                            eachCb(null);
                                        })
                                    }
                                })
                            } else {
                                winston.info("❗ rawrowobjects collection does not exists for dataset: " + keyname);
                                winston.info("💬  will build it right now....");
                                import_controller.Import_dataSourceDescriptions([desc], function () {
                                    eachCb(null);
                                });
                            }
                        }
                    })

                }

            }, function (err) {

                fn(err);
            })
        })
}
module.exports.findAllDescriptionAndSetup = _findAllDescriptionAndSetup


var _GetDescriptionsWith_uid_importRevision = function (uid, revision, fn) {


    datasource_description.findOne({uid: uid, importRevision: revision, fe_visible: true})
        .populate('_team')
        .lean()
        .exec(function (err, descriptions) {
            if (err) {
                winston.error("❌ Error occurred when finding datasource description with uid and importRevision ", err);
                fn(err, null);
            } else {
                fn(err, descriptions);
            }
        })
};

module.exports.GetDescriptionsWith_uid_importRevision = _GetDescriptionsWith_uid_importRevision



