var mongoose_client = require('../../lib/mongoose_client/mongoose_client');
var integerValidator = require('mongoose-integer');


var mongoose = mongoose_client.mongoose;
var Schema = mongoose.Schema;
//
var DatasourceDescription_scheme = Schema({
    sourceURL: String,
    fileEncoding: String,
    uid: String,
    importRevision: { 
        type: Number,
        integer: true
    },
    format: String,
    title: String,
    brandColor: String,
    url: Array,
    description: String,
    fn_new_rowPrimaryKeyFromRowObject: String,
    raw_rowObjects_FieldScheme: Object,
    fe_views:Array,
    fe_filters: {
        excludeFields: Array,
        valuesToExclude: Object
    },
    fe_viewDetails: Object
});
//


DatasourceDescription_scheme.plugin(integerValidator);

var modelName = 'DatasourceDescription';

var datasource_description = mongoose.model(modelName, DatasourceDescription_scheme);
module.exports = datasource_description;

