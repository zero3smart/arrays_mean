var async = require('async');
var winston = require('winston');
//
//
////////////////////////////////////////////////////////////////////////////////
// Controller definition
//
var constructor = function(options, context)
{
    var self = this;
    self.options = options
    self.context = context
    
    self._init()
    
    return self
};
module.exports = constructor;
constructor.prototype._init = function()
{
    var self = this;
    // console.log("raw string documents controller is up")
};

//
constructor.prototype.New_templateForPersistableObject = function(sourceDocumentRevisionKey, sourceDocumentTitle, revisionNumber, importUID, parsed_rowObjectsById, parsed_orderedRowObjectPrimaryKeys)
{
    return {
        primaryKey: sourceDocumentRevisionKey,
        title: sourceDocumentTitle,
        importUID: importUID,
        revisionNumber: revisionNumber,
        parsed_rowObjectsById: parsed_rowObjectsById,
        parsed_orderedRowObjectPrimaryKeys: parsed_orderedRowObjectPrimaryKeys
    }
};
//
var mongoose_client = require('../mongoose_client/mongoose_client');
var mongoose = mongoose_client.mongoose;
var Schema = mongoose.Schema;
//
var RawSourceDocument_scheme = Schema({
    primaryKey: { type: String, index: true }, // NOTE: This primaryKey is made by NewCustomPrimaryKeyStringWithComponents
    revisionNumber: Number,
    importUID: String,
    title: String,
    dateOfLastImport: Date
});
RawSourceDocument_scheme.index({ importUID: 1, revisionNumber: 1 }, { unique: true });
RawSourceDocument_scheme.index({ importUID: 1 }, { unique: false });
RawSourceDocument_scheme.index({ revisionNumber: 1 }, { unique: false });
constructor.prototype.Scheme = RawSourceDocument_scheme;
//
var modelName = 'RawSourceDocument';
exports.ModelName = modelName;
var RawSourceDocument_model = mongoose.model(modelName, RawSourceDocument_scheme);
RawSourceDocument_model.on('index', function(error) 
{
    if (error != null) {
        winston.error("❌  MongoDB index build error for '" + modelName + "':", error);
    } else {
        winston.info("✅  Built indices for '" + modelName + "'");
        // Don't let app start listening until indices built; Coordinate via 
        // mongoose client
        mongoose_client.FromModel_IndexHasBeenBuiltForSchemeWithModelNamed(modelName);
    }
});
constructor.prototype.Model = RawSourceDocument_model;
//
//
// Public - Accessors - Factories - UIDs
//
constructor.prototype.NewCustomPrimaryKeyStringWithComponents = function(dataSource_uid, dataSource_importRevisionNumber)
{
    return dataSource_uid + "-r" + dataSource_importRevisionNumber;
};
//
//
// Public - Imperatives - Upserts
//
constructor.prototype.UpsertWithOnePersistableObjectTemplate = function(persistableObjectTemplate, fn)
{
    var self = this;
    var persistableObjectTemplate_primaryKey = persistableObjectTemplate.primaryKey;
    
    var raw_row_objects_controller = self.context.raw_row_objects_controller;
    var parsed_orderedRowObjectPrimaryKeys = persistableObjectTemplate.parsed_orderedRowObjectPrimaryKeys;
    var parsed_rowObjectsById = persistableObjectTemplate.parsed_rowObjectsById;
    var revisionNumber = persistableObjectTemplate.revisionNumber;
    var importUID = persistableObjectTemplate.importUID;
    
    // Bulk for performance at volume
    raw_row_objects_controller.UpsertWithManyPersistableObjectTemplates(parsed_orderedRowObjectPrimaryKeys, parsed_rowObjectsById, persistableObjectTemplate_primaryKey, persistableObjectTemplate.title, function(err, result)
    {
        if (err) {
            winston.error("❌  Error: An error while saving raw row objects: ", err)
            
            return // bail
        }
        winston.log("📡  [" + (new Date()).toString() + "] Going to save source document.");
        var persistableObjectTemplate_primaryKey = persistableObjectTemplate.primaryKey;
        var updatedDocument = 
        {
            primaryKey: persistableObjectTemplate_primaryKey,
            title: persistableObjectTemplate.title,
            revisionNumber: revisionNumber,
            importUID: importUID,
            dateOfLastImport: new Date()
        };
        var findOneAndUpdate_queryParameters = 
        {
            primaryKey: persistableObjectTemplate_primaryKey
        };
        RawSourceDocument_model.findOneAndUpdate(findOneAndUpdate_queryParameters, {
            $set: updatedDocument
        }, {
            new: true, 
            upsert: true
        }, function(err, doc)
        {
            if (err) {
                winston.error("❌ [" + (new Date()).toString() + "] Error while updating a raw source document: ", err);
            } else {
                winston.info("✅  [" + (new Date()).toString() + "] Saved source document object with pKey \"" + persistableObjectTemplate_primaryKey + "\".");
            }
            fn(err, doc);
        });
    });
};