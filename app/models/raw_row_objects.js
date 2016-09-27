var async = require('async');
var winston = require('winston');
var mongoose_client = require('../../lib/mongoose_client/mongoose_client');

var mongoose = mongoose_client.mongoose;
var Schema = mongoose.Schema;
var mongooseContextsBySrcDocPKey = {};

var New_RowObjectsModelName = function (srcDocPKey) {
    return 'RawRowObjects-' + srcDocPKey;
};

var _Lazy_Shared_RawRowObject_MongooseContext = function (srcDocPKey) {
    var mongooseContext = mongooseContextsBySrcDocPKey[srcDocPKey];
    if (mongooseContext && typeof mongooseContext !== 'undefined') { // lazy cache, to avoid mongoose model re-definition error
        return mongooseContext;
    }
    //
    var forThisDataSource_RawRowObject_scheme = Schema({
        pKey: String,
        srcDocPKey: String,
        rowIdxInDoc: Number,
        rowParams: Schema.Types.Mixed // be sure to call .markModified(path) on the model before saving if you update this Mixed property
    });
    forThisDataSource_RawRowObject_scheme.index({pKey: 1, srcDocPKey: 1}, {unique: true});
    forThisDataSource_RawRowObject_scheme.index({srcDocPKey: 1}, {unique: false});
    //
    var forThisDataSource_rowObjects_modelName = New_RowObjectsModelName(srcDocPKey);
    var forThisDataSource_RawRowObject_model = mongoose.model(forThisDataSource_rowObjects_modelName, forThisDataSource_RawRowObject_scheme);
    //
    mongooseContext =
    {
        forThisDataSource_RawRowObject_scheme: forThisDataSource_RawRowObject_scheme,
        forThisDataSource_rowObjects_modelName: forThisDataSource_rowObjects_modelName,
        forThisDataSource_RawRowObject_model: forThisDataSource_RawRowObject_model
    };
    mongooseContextsBySrcDocPKey[srcDocPKey] = mongooseContext;

    return mongooseContext;
};
module.exports.Lazy_Shared_RawRowObject_MongooseContext = _Lazy_Shared_RawRowObject_MongooseContext;

module.exports.New_templateForPersistableObject = function (rowObject_primaryKey, sourceDocumentRevisionKey, rowIndex, rowParams) {
    return {
        pKey: rowObject_primaryKey, // Queries to find this unique row will have to happen
        srcDocPKey: sourceDocumentRevisionKey, // by pKey && srcDocPKey
        rowIdxInDoc: rowIndex,
        rowParams: rowParams
    };
};

// fn: (err, [Schema.Types.ObjectId])
module.exports.UpsertWithManyPersistableObjectTemplates = function (ordered_persistableObjectTemplateUIDs, persistableObjectTemplatesByUID, srcDocPKey, srcDocTitle, fn) {
    var num_parsed_orderedRowObjectPrimaryKeys = ordered_persistableObjectTemplateUIDs.length;
    winston.info("📡  [" + (new Date()).toString() + "] Upserting " + num_parsed_orderedRowObjectPrimaryKeys + " parsed rows for \"" + srcDocTitle + "\".");

    var forThisDataSource_mongooseContext = _Lazy_Shared_RawRowObject_MongooseContext(srcDocPKey);
    var forThisDataSource_RawRowObject_scheme = forThisDataSource_mongooseContext.forThisDataSource_RawRowObject_scheme;
    var forThisDataSource_rowObjects_modelName = forThisDataSource_mongooseContext.forThisDataSource_rowObjects_modelName;
    var forThisDataSource_RawRowObject_model = forThisDataSource_mongooseContext.forThisDataSource_RawRowObject_model;
    //
    mongoose_client.WhenMongoDBConnected(function () { // ^ we block because we're going to work with the native connection; Mongoose doesn't block til connected for any but its own managed methods
        var nativeCollection = forThisDataSource_RawRowObject_model.collection;
        var bulkOperation = nativeCollection.initializeUnorderedBulkOp();
        var num_ordered_persistableObjectTemplateUIDs = ordered_persistableObjectTemplateUIDs.length;

        for (var rowIdx = 0; rowIdx < num_ordered_persistableObjectTemplateUIDs; rowIdx++) {
            var rowUID = ordered_persistableObjectTemplateUIDs[rowIdx];
            var persistableObjectTemplate = persistableObjectTemplatesByUID[rowUID];
            var persistableObjectTemplate_pKey = persistableObjectTemplate.pKey;
            var persistableObjectTemplate_srcDocPKey = persistableObjectTemplate.srcDocPKey;
            var bulkOperationQueryFragment =
            {
                pKey: persistableObjectTemplate_pKey,
                srcDocPKey: srcDocPKey
            };
            bulkOperation.find(bulkOperationQueryFragment).upsert().update({$set: persistableObjectTemplate});
        }
        var writeConcern =
        {
            upsert: true
            // note: we're turning this off as it's super slow for large datasets like Artworks
            // j: true // 'requests acknowledgement from MongoDB that the write operation has been written to the journal'
        };
        bulkOperation.execute(writeConcern, function (err, result) {
            if (err) {
                winston.error("❌ [" + (new Date()).toString() + "] Error while saving raw row objects: ", err);
            } else {
                winston.info("✅  [" + (new Date()).toString() + "] Saved raw row objects.");
            }
            fn(err, result);
        });
    });
};

// fn: (err, [Schema.Types.ObjectId])
module.exports.InsertManyPersistableObjectTemplates = function (ordered_persistableObjectTemplateUIDs, persistableObjectTemplatesByUID, srcDocPKey, srcDocTitle, fn) {
    var num_parsed_orderedRowObjectPrimaryKeys = ordered_persistableObjectTemplateUIDs.length;
    winston.info("📡  [" + (new Date()).toString() + "] Inserting " + num_parsed_orderedRowObjectPrimaryKeys + " parsed rows for \"" + srcDocTitle + "\".");

    var forThisDataSource_mongooseContext = _Lazy_Shared_RawRowObject_MongooseContext(srcDocPKey);
    var forThisDataSource_RawRowObject_scheme = forThisDataSource_mongooseContext.forThisDataSource_RawRowObject_scheme;
    var forThisDataSource_rowObjects_modelName = forThisDataSource_mongooseContext.forThisDataSource_rowObjects_modelName;
    var forThisDataSource_RawRowObject_model = forThisDataSource_mongooseContext.forThisDataSource_RawRowObject_model;
    //
    mongoose_client.WhenMongoDBConnected(function () { // ^ we block because we're going to work with the native connection; Mongoose doesn't block til connected for any but its own managed methods
        var nativeCollection = forThisDataSource_RawRowObject_model.collection;

        var updateDocs = [];
        for (var rowIdx = 0; rowIdx < ordered_persistableObjectTemplateUIDs.length; rowIdx++) {
            var rowUID = ordered_persistableObjectTemplateUIDs[rowIdx];

            updateDocs.push({
                insertOne: {document: persistableObjectTemplatesByUID[rowUID]}
            });
        }
        nativeCollection.bulkWrite(updateDocs, {ordered: false}, function (err, result) {
            if (err) {
                winston.error("❌ [" + (new Date()).toString() + "] Error while saving raw row objects: ", err);
            } else {
                winston.info("✅  [" + (new Date()).toString() + "] Saved raw row objects.");
            }
            return fn(err, result);
        });
    });
};