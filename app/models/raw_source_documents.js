var async = require('async');
var winston = require('winston');
var mongoose_client = require('./mongoose_client');

var mongoose = mongoose_client.mongoose;
var Schema = mongoose.Schema;
//
var RawSourceDocument_scheme = Schema({
    primaryKey: {type: String, index: true}, // NOTE: This primaryKey is made by NewCustomPrimaryKeyStringWithComponents
    revisionNumber: Number,
    importUID: String,
    title: String,
    numberOfRows: Number,
    dateOfLastImport: Date
});
RawSourceDocument_scheme.index({importUID: 1, revisionNumber: 1}, {unique: true});
RawSourceDocument_scheme.index({importUID: 1}, {unique: false});
RawSourceDocument_scheme.index({revisionNumber: 1}, {unique: false});
//
var modelName = 'RawSourceDocument';
var RawSourceDocument_model = mongoose.model(modelName, RawSourceDocument_scheme);
RawSourceDocument_model.on('index', function (error) {
    if (error != null) {
        winston.error("❌  MongoDB index build error for '" + modelName + "':", error);
    } else {
        // winston.info("✅  Built indices for '" + modelName + "'");
        // Don't let app start listening until indices built; Coordinate via 
        // mongoose client
        mongoose_client.FromModel_IndexHasBeenBuiltForSchemeWithModelNamed(modelName);
    }
});

module.exports.ModelName = modelName;

module.exports.Model = RawSourceDocument_model;

module.exports.New_templateForPersistableObject = function (sourceDocumentRevisionKey, sourceDocumentTitle, revisionNumber, importUID, parsed_rowObjectsById, parsed_orderedRowObjectPrimaryKeys, numberOfRows) {
    return {
        primaryKey: sourceDocumentRevisionKey,
        title: sourceDocumentTitle,
        importUID: importUID,
        revisionNumber: revisionNumber,
        parsed_rowObjectsById: parsed_rowObjectsById,
        parsed_orderedRowObjectPrimaryKeys: parsed_orderedRowObjectPrimaryKeys,
        numberOfRows: numberOfRows
    }
};

module.exports.NewCustomPrimaryKeyStringWithComponents = function (teamSubdomain, dataSource_uid, dataSource_importRevisionNumber) {
    return teamSubdomain + '-' + dataSource_uid + "-r" + dataSource_importRevisionNumber;
};

module.exports.UpsertWithOnePersistableObjectTemplate = function (append,persistableObjectTemplate, fn) {
    winston.log("📡  [" + (new Date()).toString() + "] Going to save source document.");

    var updatedDocument = {};
    updatedDocument['primaryKey'] = persistableObjectTemplate.primaryKey;
    if (persistableObjectTemplate.title) updatedDocument['title'] = persistableObjectTemplate.title;
    if (persistableObjectTemplate.revisionNumber) updatedDocument['revisionNumber'] = persistableObjectTemplate.revisionNumber;
    if (persistableObjectTemplate.importUID) updatedDocument['importUID'] = persistableObjectTemplate.importUID;
    var numberOfRowsUpdateQuery = {};
    if (persistableObjectTemplate.numberOfRows && !append )  {
        updatedDocument["numberOfRows"] =  persistableObjectTemplate.numberOfRows
    } else if (persistableObjectTemplate.numberOfRows && append) {
         numberOfRowsUpdateQuery = {numberOfRows: persistableObjectTemplate.numberOfRows}
    }
    updatedDocument['dateOfLastImport'] = new Date();

    var findOneAndUpdate_queryParameters =
    {
        primaryKey: persistableObjectTemplate.primaryKey
    };

    var query = {
        $set: updatedDocument
    } 


    if (append) {
        query = {
             $set: updatedDocument, $inc: numberOfRowsUpdateQuery
        }
    }

    RawSourceDocument_model.findOneAndUpdate(findOneAndUpdate_queryParameters, query, {
        upsert: true
    }, function (err, doc) {
        if (err) {
            winston.error("❌ [" + (new Date()).toString() + "] Error while updating a raw source document: ", err);
        } else {
            winston.info("✅  [" + (new Date()).toString() + "] Saved source document object with pKey \"" + persistableObjectTemplate.primaryKey + "\".");
        }
        fn(err, doc);
    });
};

module.exports.IncreaseNumberOfRawRows = function (pKey, numberOfRows, fn) {

    winston.log("📡  [" + (new Date()).toString() + "] Going to increase the number of raw rows in the source document.");



    var findOneAndUpdate_queryParameters =
    {
        primaryKey: pKey
    };

    RawSourceDocument_model.findOneAndUpdate(findOneAndUpdate_queryParameters, {
        $set: {dateOfLastImport: new Date()},
        $inc: {numberOfRows: numberOfRows},
    }, {
        upsert: true
    }, function (err, doc) {


        if (err) {
            winston.error("❌ [" + (new Date()).toString() + "] Error while increasing the number of raw rows in a raw source document: ", err);
        } else {
            winston.info("✅  [" + (new Date()).toString() + "] Increased the number of raw rows in a source document object with pKey \"" + pKey + "\".");
        }
        fn(err, doc);
    });
};