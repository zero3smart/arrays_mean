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
    schema_id: String,
    fe_visible: {
        type: Boolean,
        default: true
    },
    logo: String,
    _otherSources: [{type: Schema.Types.ObjectId, ref: 'DatasourceDescription'}],
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
    _team: {type: Schema.Types.ObjectId,ref: "Team"},
    fe_filters: {
        excludeFields: Array,
        valuesToExclude: Object,
        default_filter: Object
    },
    customFieldsToProcess: Array,
    relationshipFields: Object,
    fe_displayTitleOverrides: Object
});



DatasourceDescription_scheme.plugin(integerValidator);

var modelName = 'DatasourceDescription';

var datasource_description = mongoose.model(modelName, DatasourceDescription_scheme);
module.exports = datasource_description;

