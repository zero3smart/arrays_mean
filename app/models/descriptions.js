var integerValidator = require('mongoose-integer');
var fs = require('fs');
var team = require('./teams'); // Do not remove, it should be proceed at first.
var winston = require('winston');
var Promise = require('q').Promise;
var _ = require("lodash");
var async = require('async');
var nodemailer = require('.././libs/utils/nodemailer');

var mongoose_client = require('./mongoose_client');
var imported_data_preparation = require('../libs/datasources/imported_data_preparation');
var import_controller = require('../libs/import/data_ingest/controller');
var User = require('../models/users');
var Team = require('../models/teams');

var raw_source_documents = require('../models/raw_source_documents');
var cached_values = require('../models/cached_values');

var mongoose = mongoose_client.mongoose;
var Schema = mongoose.Schema;
//
var DatasourceDescription_scheme = Schema({

    uid: String,

    importRevision: {type: Number, integer: true, default: 1},
    schema_id: {type: Schema.Types.ObjectId, ref: 'DatasourceDescription'},
    banner: String,
    format: String, //csv, tsv, json
    connection: Object,
    title: String,
    brandColor: String,
    urls: Array,
    description: String,
    fe_visible: {type: Boolean, default: false},
    fe_listed: {type: Boolean, default: false},

    useCustomView: {type: Boolean, default: false},
    fileName: String,
    
    raw_rowObjects_coercionScheme: Object,
    fe_excludeFields: Object,

    fe_displayTitleOverrides: Object,


    // imageScraping: [],
    objectTitle: String,

    fe_image: {
        field: String,
        overwrite: {type: Boolean, default: false},
        scraped: {type: Boolean,default: false},
        selector : String //optional
    } ,

    fe_fieldDisplayOrder: Array,
    fe_filters: {
        excludeFields: Array,
        fieldsSortableByInteger: Array,
        fieldsSortableInReverseOrder: Array,
        fieldsCommaSeparatedAsIndividual: Array,
        fieldsMultiSelectable: Array,
        fieldsNotAvailable: Array,
        keywords: Array,
        oneToOneOverrideWithValuesByTitleByFieldName: Object,
        valuesToExcludeByOriginalKey: Object,
        fabricated: Array,
        default: Object
    },

    _otherSources: [{type: Schema.Types.ObjectId, ref: 'DatasourceDescription'}],
    customFieldsToProcess: [],
    relationshipFields: [],

    fe_views: {
        default_view: String,
        views: Object
    },

    _team: {type: Schema.Types.ObjectId, ref: 'Team'},

    isPublic: {type: Boolean, default: false},
    sample: {type: Boolean, default: false},

    fe_objectShow_customHTMLOverrideFnsByColumnNames: Object,

    fe_nestedObject: {
        prefix: String,
        fields: Array,
        fieldOverrides: Object,
        valueOverrides: Object,
        criteria: {
            fieldName: String,
            operatorName: String, // "equal"
            value: String // ""
        },
        nestingKey: String
    },

    author: {type: Schema.Types.ObjectId, ref: 'User'},
    updatedBy: {type: Schema.Types.ObjectId, ref: 'User'},
    lastImportInitiatedBy: {type: Schema.Types.ObjectId, ref: 'User'},

    imported: {type: Boolean, default: false},
    dirty: {type: Number, integer: true, default: 0},
    //0: nth to do, imported
    //1: reimport from begining
    //2: starting from import processed
    //3: post import caching
    //4: only image scraping 

    skipImageScraping: {type: Boolean, default: false},

    jobId: {type: Number,integer: true, default: 0},

    //0: no job has started, job has completed
    //all others: related to the jobId in the queue

    state : String
    //pending
    //approved
    //disapproved, maybe notify the user about this

    


},{ timestamps: true, minimize: false});

var deepPopulate = require('mongoose-deep-populate')(mongoose);
DatasourceDescription_scheme.plugin(integerValidator);
DatasourceDescription_scheme.plugin(deepPopulate, {whitelist: ['_otherSources', '_otherSources._team', 'schema_id', '_team', 'schema_id._team',
        'author']});



DatasourceDescription_scheme.pre('save',function(next) {
    this._wasNew = this.isNew;
    next();
})

DatasourceDescription_scheme.post('save',function(doc) {
    if (doc._wasNew) {
        this.populate('author _team',function(err,docPopulatedWithAuthor) {
            if (!docPopulatedWithAuthor.schema_id) {
                if (err || !docPopulatedWithAuthor.author) {
                    winston.error('Viz created with error');
                    console.log(err);
                } else {
                    nodemailer.newVizCreatedEmail(docPopulatedWithAuthor,function(err) {
                        if (err) winston.error('cannot send user alert email');
                        else {
                            winston.info('Viz created email sent');
                        }
                    })
                }
            }
        })
    }
})



DatasourceDescription_scheme.pre('remove',function(next) {
    var thisId = this._id;



    if (!this.schema_id) {
        
        async.parallel([
            function(callback) {
                mongoose_client.dropCollection('rawrowobjects-' + thisId, function (err) {
                    // Consider that the collection might not exist since it's in the importing process.
                    if (err && err.code != 26) return callback(err);
                    winston.info("✅  Removed raw row object : " + thisId );
                    callback(null);
                })
            },
            function(callback) {
                mongoose_client.dropCollection('processedrowobjects-' + thisId, function (err) {
                // Consider that the collection might not exist since it's in the importing process.
                    if (err && err.code != 26) return done(err);

                    winston.info("✅  Removed processed row object : " + thisId);
                    callback(null);
                });
            },
            function(callback) {

                raw_source_documents.Model.remove({primaryKey: thisId},function(err) {

                    if (err) return callback(err);
                    winston.info("✅  Removed raw source document : " + thisId);
                    callback(null);

                })

            },
            function(callback) {

                cached_values.remove({srcDocPKey: thisId},function(err) {
                    if (err) return callback(err);
                    winston.info("✅  Removed cached unique values : " + thisId) ;
                    callback(null);
                })
            }

        ],function(err){

            if (err) console.log(err);
            next();
        })

    } else {
        next();
    }
    
})


var datasource_description = mongoose.model('DatasourceDescription', DatasourceDescription_scheme,'datasourcedescriptions');




/* -----------   helper function ----------- */
var _mergeObject = function (obj1, obj2) {
    var obj3 = {};
    for (var attrname in obj1) {
        obj3[attrname] = obj1[attrname]
    }
    for (var attrname in obj2) {
        obj3[attrname] = obj2[attrname];
    }
    return obj3;
};

var _consolidate_descriptions_hasSchema = function (description) {
    var desc = _.omit(description, ['schema_id'])
    var schemaDesc = description.schema_id;
    desc.schemaId = schemaDesc._id;
    for (var attrname in schemaDesc) {
        if (desc[attrname]) {
            if (Array.isArray(desc[attrname])) {
                desc[attrname] = schemaDesc[attrname].concat(desc[attrname]);

            } else if (typeof desc[attrname] == 'string') {

            } else if (typeof desc[attrname] == 'object') {
                desc[attrname] = _mergeObject(schemaDesc[attrname], desc[attrname]);

            }
        } else {
            desc[attrname] = schemaDesc[attrname]
        }
    }

    return desc;
};

datasource_description.Consolidate_descriptions_hasSchema = _consolidate_descriptions_hasSchema;

var _checkCollection = function (datasource_description, schemaKey, eachCb) {
    if (schemaKey != null) {
        mongoose_client.checkIfDatasetImportedInSchemaCollection('rawrowobjects-' + schemaKey, datasource_description.dataset_uid, function (err, existInRaw) {

            if (err) {
                winston.error("❌ err when checking mongo collection exists, from callback ");
                eachCb(err);
            } else {
                if (existInRaw == true) {
                    winston.info("✅ rawrowobjects collection exists for dataset_uid: ", datasource_description.dataset_uid);
                    mongoose_client.checkIfDatasetImportedInSchemaCollection('processedrowobjects-' + keyname, datasource_description.dataset_uid, function (err, existInProcessed) {
                        if (err) {
                            eachCb(err);
                        } else if (existInProcessed == true) {
                            winston.info("✅ processedrowobjects collection exists for dataset_uid: ", datasource_description.dataset_uid);
                            eachCb(null);
                        } else {
                            winston.info("❗ processedrowobjects collection does not exists for dataset_uid: ", datasource_description.dataset_uid);
                            winston.info("💬  will build it right now....");

                            var descriptions = [];

                            import_controller.PostProcessRawObjects([datasource_description], function (err) {
                                if (err) {
                                    // TODO: Error Handler
                                }
                                eachCb(null);
                            })
                        }
                    })
                } else {

                    winston.info("❗ rawrowobjects collection does not exists for dataset_uid: " + schemaKey);
                    winston.info("💬  will build it right now....");
                    import_controller.Import_dataSourceDescriptions([datasource_description], function () {
                        eachCb(null);
                    });

                }

            }

        })

    } else {
        keyname = imported_data_preparation.DataSourcePKeyFromDataSourceDescription(datasource_description).toLowerCase();
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

                            import_controller.PostProcessRawObjects([datasource_description], function (err) {
                                if (err) {
                                    // TODO: Error Handler
                                }
                                eachCb(null);
                            })
                        }
                    })
                } else {
                    winston.info("❗ rawrowobjects collection does not exists for dataset: " + keyname);
                    winston.info("💬  will build it right now....");
                    import_controller.Import_dataSourceDescriptions([datasource_description], function () {
                        eachCb(null);
                    });
                }
            }
        })

    }

}

/* -------   end helper function ------------  */

// Customize the model
function getDescriptionsAndPopulateTeam(teamQuery, datasetQuery, callback) {
    datasource_description.find(datasetQuery)
        .populate({
            path: '_team',
            match: teamQuery,
            select: 'subdomain admin _id title'
        })
        .sort({"createdAt": "desc"})
        .exec(function (err, datasets) {
            callback(err, datasets)
        })
};

var _GetAllDescriptions = function (userId, callback) {

    function nonLoginUserQuery(cb) {
        var publicAndImportedDataset = {isPublic: true, imported: true, fe_visible: true, state: 'approved'};
        var publicAndConnectedDataset = {isPublic:true,connection:{$ne:null}, fe_listed:true, fe_visible:true};
        getDescriptionsAndPopulateTeam({ $or: [ {'superTeam': true}, {'subscription.state': 'active'} ] },
            {$or: [publicAndImportedDataset, publicAndConnectedDataset]}, cb)
    }

    if (userId) {
        User.findById(userId)
            .populate('_team')
            .populate('defaultLoginTeam')
            .exec(function (err, foundUser) {
                if (err) return callback(err);
                if (!foundUser) return nonLoginUserQuery(callback);
                var importedDataset = {imported: true, fe_visible: true, state: 'approved'};
                var connectedDataset = {connection: {$ne: null}, fe_listed: true, fe_visible: true};

                if(foundUser.isSuperAdmin()) {
                    // get descriptionsand populate dataset with query/teams 
                    getDescriptionsAndPopulateTeam({}, {$or: [importedDataset, connectedDataset] }, callback);
                } else if (foundUser.defaultLoginTeam.admin == userId) {
                    var myTeamId = foundUser.defaultLoginTeam._id;
                    var otherTeams = {_team: {$ne: myTeamId}, isPublic: true};
                    var myTeam = {_team: foundUser.defaultLoginTeam._id};

                    // get descriptions and populate dataset with query/teams
                    getDescriptionsAndPopulateTeam(
                        {$or: [{'superTeam': true}, {'subscription.state': 'active'} ] }, 
                        {$and: [
                            {$or: [myTeam, otherTeams]}, 
                            {$or: [importedDataset, connectedDataset]}
                        ]}, 
                        callback)

                } else { 
                    var myTeamId = foundUser.defaultLoginTeam._id;
                    var otherTeams = { _team: { $ne: myTeamId }, isPublic: true};


                    var myTeam = {_team: foundUser.defaultLoginTeam._id, $or: [{ _id: {$in: foundUser._editors} }, {_id: { $in: foundUser._viewers} }] };

                    // get descriptions populate
                    getDescriptionsAndPopulateTeam(
                        {$or: [{'superTeam': true}, {'subscription.state': 'active'}]},
                        {$and: [
                            {$or: [myTeam, otherTeams]},
                            {$or: [importedDataset, connectedDataset]}
                        ]}, 
                    callback)
                }
            });
    } else {
        nonLoginUserQuery(callback);
    }
};
datasource_description.GetAllDescriptions = _GetAllDescriptions;

var _GetDescriptions = function (fn) {

    var self = this;

    mongoose_client.WhenMongoDBConnected(function () {

        self.find({
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

datasource_description.GetDescriptions = _GetDescriptions;

var _datasetsNeedToReimport = function (currentSourceId,cb) {

    datasource_description.find({_otherSources: currentSourceId},function(err,relatedSources) {
        if (err) return cb(err);
        if (!relatedSources) return cb(null,{datasets:[]});
        var datasetsNeedToReimport = [];
        relatedSources.forEach(function(src) {
            if (src.relationshipFields) {

                for (var i = 0; i < src.relationshipFields.length; i++) {

                    if (src.relationshipFields[i].relationship == true && 
                        src.relationshipFields[i].by.joinDataset == currentSourceId) {
                        datasetsNeedToReimport.push(src);
                    }

                 }

            }


        })
        cb(null,{datasets:datasetsNeedToReimport});


    })

}


datasource_description.datasetsNeedToReimport = _datasetsNeedToReimport;


var _GetDescriptionsToSetupByIds = function (Ids, fn) {

    var descriptions = [];
    var self = this;


    function asyncFunction(id, cb) {
        self.findOne({$or: [{_id: id}, {schema_id: id}]})
            .lean()
            .deepPopulate('_otherSources schema_id _team _otherSources._team schema_id._team', {
                populate: {
                    '_otherSources' : {
                        match: {'imported': false}
                    }
                }
            })
            .exec(function (err, description) {
                // console.log(JSON.stringify(description));
                if (err) {
                    winston.error("❌ Error occurred when finding datasource description: ", err);
                } else {

                    if (description._otherSources && description._otherSources.length > 0) {
                        var omitted = _.omit(description, ["_otherSources"]);
                        descriptions.push(omitted);
                        _.map(description._otherSources, function (src) {
                            var excludeOtherSource = _.omit(src, ["_otherSources"])
                            descriptions.push(excludeOtherSource);
                        });
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

    var requests = Ids.map(function (Id) {
        return new Promise(function (resolve) {
            asyncFunction(Id, resolve);
        });
    });

    Promise.all(requests).then(function () {
        fn(descriptions);
    });

}

datasource_description.GetDescriptionsToSetup = _GetDescriptionsToSetupByIds;


var _GetDescriptionsWith_subdomain_uid_importRevision = function (subdomain,uid, revision, fn) {

    var subdomainQuery = {};
    if (subdomain !== null) {
        subdomainQuery["subdomain"] = subdomain;
    }
   
    this.find({uid: uid, importRevision: revision, fe_visible: true})
        .populate({
            path: '_team',
            match: subdomainQuery
        })
        .lean()
        .exec(function (err, descriptions) {
            descriptions = descriptions.filter(function (description) {
                if (description._team !== null) {
                    return description
                }
            });
            descriptions  = descriptions[0];
            if (err) {
                winston.error("❌ Error occurred when finding datasource description with uid and importRevision ", err);
                fn(err, null);
            } else {

                fn(err, descriptions);
            }
        })
};

datasource_description.GetDescriptionsWith_subdomain_uid_importRevision = _GetDescriptionsWith_subdomain_uid_importRevision;

function _GetDatasourceByUserAndKey(userId, sourceKey, fn) {


    imported_data_preparation.DataSourceDescriptionWithPKey(sourceKey)
        .then(function(datasourceDescription) {

            var subscription = datasourceDescription._team.subscription ? datasourceDescription._team.subscription : { state: null };

            if ( (!datasourceDescription.fe_visible || !datasourceDescription.imported) && !datasourceDescription.connection ) return fn();

            if (userId) {
                User.findById(userId)
                    .populate('_team')
                    .exec(function(err, foundUser) {

                        if (err) return fn(err);
                    

                        if (!foundUser) {

                            if (subscription.state != 'in_trial' && subscription.state != 'active' && datasourceDescription._team.superTeam !== true) return fn();
                            
                            if (datasourceDescription.isPublic) return fn(null, datasourceDescription);
                        } else {

                            if (
                                foundUser.isSuperAdmin() || 
                                (

                                    datasourceDescription.author.equals(foundUser._id) ||
                                    foundUser._editors.indexOf(datasourceDescription._id) >= 0 ||
                                    foundUser._viewers.indexOf(datasourceDescription._id) >= 0 ||
                                    datasourceDescription.isPublic
                                ) && ( 
                                    subscription.state === 'active' || subscription.state === 'canceled' || datasourceDescription._team.superTeam == true

                                )
                            ) {
                                return fn(null, datasourceDescription);
                            } else {
                                return fn();
                            }
                        }

                        
                    });

            } else {

                if (subscription.state != 'in_trial' && subscription.state != 'active' && datasourceDescription._team.superTeam !== true) return fn();




                if (datasourceDescription.isPublic) return fn(null, datasourceDescription);

                fn();
            }

        })
        .catch(function(err) {
            if (err) winston.error("❌  cannot bind Data to the view, error: ", err);
            fn(err);
        });
}

datasource_description.GetDatasourceByUserAndKey = _GetDatasourceByUserAndKey;

module.exports = datasource_description;