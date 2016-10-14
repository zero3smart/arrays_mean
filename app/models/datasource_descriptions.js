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
    dataset_uid: String,
    format: String,
    title: String,
    brandColor: String,
    url: Array,
    description: String,
    fn_new_rowPrimaryKeyFromRowObject: String,
    raw_rowObjects_FieldScheme: Object,
    fe_displayTitleOverrides: Array,
    fe_views: {
        default_view : String,
        views: Object
    },
    fe_filters: {
        excludeFields: Array,
        valuesToExclude: Object,
        default_filter: Object
    },
    fe_displayTitleOverrides: Object
});
//


DatasourceDescription_scheme.plugin(integerValidator);

var modelName = 'DatasourceDescription';

var datasource_description = mongoose.model(modelName, DatasourceDescription_scheme);
module.exports = datasource_description;

