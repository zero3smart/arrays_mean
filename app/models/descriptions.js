var mongoose_client = require('../../lib/mongoose_client/mongoose_client');
var integerValidator = require('mongoose-integer');


var mongoose = mongoose_client.mongoose;
var Schema = mongoose.Schema;
//
var DatasourceDescription_scheme = Schema({
    uid: String, // It is not changeable once it's generated automaticlly when creating a descrpition
    importRevision: {type: Number,integer: true, default: 1},
    schema_id: String,
    logo: String,
    dataset_uid: String, // It is not changeable once it's generated automaticlly when creating a descrpition
    format: String,
    title: String,
    brandColor: String,
    urls: Array,
    description: String,
    fe_visible: {type: Boolean, default: true},
    fe_listed: {type: Boolean, default: true},

    fn_new_rowPrimaryKeyFromRowObject: String,
    raw_rowObjects_coercionScheme: Object,
    fe_excludeFields: Array,
    fe_displayTitleOverrides: Object,
    fe_designatedFields: Object,
    fe_fieldDisplayOrder: Object,

    fe_filters: {
        excludeFields: Array,
        valuesToExclude: Object,
        fabricated: Array,
        default: Object,
        fieldsSortableByInteger: Array,
        fieldsCommaSeparatedAsIndividual: Array,
        fieldsMultiSelectable: Array,
        fieldsNotAvailable: Array,
        keywords: Array,
    },

    _otherSources: [{type: Schema.Types.ObjectId, ref: 'DatasourceDescription'}],
    customFieldsToProcess: Array,
    relationshipFields: Object,

    fe_views: {
        default_view: String,
        views: {
            gallery: Object,
            chart: Object,
            timeline: Object,
            wordCloud: Object,
            scatterplot: Object,
            pieSet: Object,
            lineGraph: Object,
            barChart: Object

        }
    },

    
    _team: {type: Schema.Types.ObjectId, ref: "Team"},

    fe_objectShow_customHTMLOverrideFnsByColumnNames: Object,

    imageScrapping: Array,

    fe_nestedObject: {
        prefix: String,
        fields: Array,
        fieldOverrides: Object,
        criteria: {
            fieldName: String,
            operatorName: String,
            value: String,
        }
    },
});


DatasourceDescription_scheme.plugin(integerValidator);

var modelName = 'DatasourceDescription';

var datasource_description = mongoose.model(modelName, DatasourceDescription_scheme);
module.exports = datasource_description;

