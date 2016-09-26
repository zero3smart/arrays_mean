var winston = require('winston');
var mongoose_client = require('../../lib/mongoose_client/mongoose_client');

var mongoose = mongoose_client.mongoose;
var Schema = mongoose.Schema;

var MongooseScheme = Schema({
    dateCreated: {type: Date, default: Date.now},
    //
    pageType: String,
    viewType: String, // will not be on every share - only on array views
    //
    sourceKey: String,
    rowObjectId: String,  // will not be on every share - only for object details, at present
    query: Schema.Types.Mixed
});
var modelName = 'SharedPage';
var Model = mongoose.model(modelName, MongooseScheme);

module.exports.New_templateForPersistableObject = function (pageType, viewType_orNull, sourceKey, rowObjectId_orNull, query) {
    return {
        pageType: pageType,
        viewType: viewType_orNull,
        sourceKey: sourceKey,
        rowObjectId: rowObjectId_orNull,
        query: query || {} // so that it can't be null
    };
};

module.exports.FindOneWithId = function (id, fn) {
    Model.findOne({_id: id}, fn);
};

module.exports.InsertOneWithPersistableObjectTemplate = function (persistableObjectTemplate, fn) {
    var insertableObject = new Model(persistableObjectTemplate);
    insertableObject.save(function (err, doc) {
        if (err) {
            winston.error("❌ [" + (new Date()).toString() + "] Error while inserting a shared page: ", err, persistableObjectTemplate);
        }
        fn(err, doc);
    });
};
