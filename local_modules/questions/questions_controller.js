var async = require('async');
var winston = require('winston');
//
var mongoose_client = require('../mongoose_client/mongoose_client');
//
//
////////////////////////////////////////////////////////////////////////////////
//
var constructor = function(options, context)
{
    var self = this;
    self.options = options;
    self.context = context;
    //
    self._init();
    //
    return self;
};
module.exports = constructor;
constructor.prototype._init = function()
{
    var self = this;
    // console.info("💬  Questions Controller initialized")
};
//
//
//
// Public - Accessors
//
constructor.prototype.FieldValuesOf_RawRowObjectsInSrcDoc_WhereFieldValueIs = function(mapValuesOfFieldNamed, inSrcDoc_primaryKeyString, match_fieldPath, match_fieldValue, fn)
{
    var self = this;
    var collection_mongooseContext = self.context.raw_row_objects_controller.Lazy_Shared_RawRowObject_MongooseContext(inSrcDoc_primaryKeyString);
    var collection_mongooseModel = collection_mongooseContext.forThisDataSource_RawRowObject_model;
    var collection_mongooseScheme = collection_mongooseContext.forThisDataSource_RawRowObject_scheme;
    //
    var filterOperator = { $match: {} };
    filterOperator["$match"]["" + match_fieldPath] = match_fieldValue;
    //
    var stripOperator = 
    {
        $project: {
            _id: 0,
            "V" : ("$" + mapValuesOfFieldNamed)
        }
    };
    //
    var aggregationOperators =
    [
        filterOperator,
        stripOperator        
    ];
    //
    var doneFn = function(err, results)
    {
        if (err) {
            fn(err, null);

            return;
        }
        if (results == undefined || results == null || results.length == 0) {
            fn(null, []);

            return;
        }
        // Now map results into list of flat values
        var values = results.map(function(el)
        {
            return el.V;
        });
        fn(err, values);
    };
    collection_mongooseModel.aggregate(aggregationOperators).allowDiskUse(true).exec(doneFn);
}