var winston = require('winston');
//
//
////////////////////////////////////////////////////////////////////////////////
// Controller definition
//
var constructor = function(options, context)
{
    var self = this;
    self.options = options;
    self.context = context;
    
    self._init();
    
    return self;
};
module.exports = constructor;
constructor.prototype._init = function()
{
    var self = this;
    // console.log("shared pages controller is up")
};

//
constructor.prototype.New_templateForPersistableObject = function(pageType, viewType_orNull, sourceKey, rowObjectId_orNull, query)
{
    return {
        pageType: pageType,
        viewType: viewType_orNull,
        sourceKey: sourceKey,
        rowObjectId: rowObjectId_orNull,
        query: query || {} // so that it can't be null
    };
};
//
var mongoose_client = require('../../lib/mongoose_client/mongoose_client');
var mongoose = mongoose_client.mongoose;
var Schema = mongoose.Schema;
//
var MongooseScheme = Schema({
    dateCreated: { type: Date, default: Date.now },
    //
    pageType: String,
    viewType: String, // will not be on every share - only on array views
    //
    sourceKey: String,
    rowObjectId: String,  // will not be on every share - only for object details, at present
    query: Schema.Types.Mixed
});
constructor.prototype.Scheme = MongooseScheme;
//
var modelName = 'SharedPage';
exports.ModelName = modelName;
var Model = mongoose.model(modelName, MongooseScheme);
constructor.prototype.Model = Model;
//
//
////////////////////////////////////////////////////////////////////////////////
// Public - Accessors - Queries
//
constructor.prototype.FindOneWithId = function(id, fn)
{
    var self = this;
    Model.findOne({ _id: id }, fn);
};
//
//
////////////////////////////////////////////////////////////////////////////////
// Public - Imperatives - Insertions
//
constructor.prototype.InsertOneWithPersistableObjectTemplate = function(persistableObjectTemplate, fn)
{
    var self = this;
    //
    var insertableObject = new Model(persistableObjectTemplate);
    insertableObject.save(function(err, doc)
    {
        if (err) {
            winston.error("❌ [" + (new Date()).toString() + "] Error while inserting a shared page: ", err, persistableObjectTemplate);
        }
        fn(err, doc);
    });
};
