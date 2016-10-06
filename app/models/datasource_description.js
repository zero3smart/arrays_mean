var mongoose_client = require('../../lib/mongoose_client/mongoose_client');

var mongoose = mongoose_client.mongoose;
var Schema = mongoose.Schema;
//
var DatasourceDescription_scheme = Schema({
    // Unique
    filename: String,
    fileEncoding: String,
    importRevision: Number,
    uid: String,
    title: String,

    // Relationships
    schema_id: String,
    dataset_uid: String,
    team_id: String,

    // General
    format: String,
    brandcolor: String,
    description: String,
    urls: Array,
    logo: String,

    // Views
    fe_views: Object,
    fe_default_view: String,
    fe_view_descriptions: Object,
    fe_outputInFormat: Object,
    fe_displayTitleOverrides: Object,

    // Fields
    raw_rowObjects_coercionScheme: String,
    fn_new_rowPrimaryKeyFromRowObject: String,
    fe_designatedFields: Object,

    fe_nestedObject_prefix: String,
    fe_nestedObject_fields: Array,
    fe_nestedObject_fieldOverrides: Object,
    fe_nestedObject_valueOverrides: Object,
    fe_nestedObject_criteria: String,


    // Callbacks during the import
    afterImportingAllSources_generate: Array,
    afterImportingAllSources_generateByScraping: Array,
    afterGeneratingProcessedRowObjects_setupBefore_eachRowFn: String,
    afterGeneratingProcessedRowObjects_eachRowFn: String,
    afterGeneratingProcessedRowObjects_afterIterating_eachRowFn: String,

    // Filters
    fe_filters_default: Object,
    fe_filters_fieldsNotAvailable: Array,
    fe_filters_fieldsMultiselectable: Array,
    fe_filters_fieldsCommaSeparatedAsIndividual: Array,
    fe_filters_fieldsSortableByInteger: Array,
    fe_filters_oneToOneOverrideWithValuesByTitleByFieldName: Object,
    fe_filters_valuesToExcludeByOriginalKey: Object,
    fe_filters_fabricatedFilters: Array,
    fe_filters_keywordFilters: Array,

    // Gallery
    fe_gallery_defaultSortByColumnName_humanReadable: String,
    fe_gallery_defaultGroupByColumnName_humanReadable: String,
    fe_galleryItem_htmlForIconFromRowObjWhenMissingImage: String,

    // Chart
    fe_chart_defaultGroupByColumnName_humanReadable: String,
    fe_chart_fieldsNotAvailableAsGroupByColumns: Array,
    fe_chart_valuesToExcludeByOriginalKey: Object,

    // Choropleth
    fe_choropleth_defaultMapByColumnName_humanReadable: String,
    fe_choropleth_fieldsNotAvailableAsMapByColumns: Array,

    // Scatterplot
    fe_scatterplot_fieldsMap: Array,
    fe_scatterplot_fieldsNotAvailable: Array,
    fe_scatterplot_defaults: Object,
    fe_scatterplot_tooltip_term: String,

    // Timeline
    fe_timeline_defaultGroupByColumnName_humanReadable: String,
    fe_timeline_fieldsNotAvailableAsSortByColumns: Array,
    fe_timeline_fieldsNotAvailableAsGroupByColumns: Array,
    fe_timeline_tooltipDateFormat: String,

    // WordCloud
    fe_wordCloud_defaultGroupByColumnName_humanReadable: String,
    fe_wordCloud_fieldsNotAvailableAsGroupByColumns: Array,
    fe_wordCloud_keywords: Array,

    // LineGraph
    fe_lineGraph_defaultGroupByColumnName_humanReadable: String,
    fe_lineGraph_fieldsNotAvailableAsGroupByColumns: Array,
    fe_lineGraph_outputInFormat: Object,
    fe_lineGraph_defaultAggregateByColumnName_humanReadable: String,
    fe_lineGraph_aggregateByColumnName_numberOfRecords_notAvailable: Boolean,
    fe_lineGraph_stackByColumnName_humanReadable: String,
    fe_lineGraph_stackedLineColors: Object,
    fe_lineGraph_mapping_dataSource_pKey: String,
    fe_lineGraph_mapping_dataSource_fields: Object,

    // Bar Chart

    // Object Details
    fe_fieldDisplayOrder: Array,
    fe_objectShow_customHTMLOverrideFnsByColumnName: Object,

    user_id: String,
    dateOfLastImport: Date
});
//
var modelName = 'DatasourceDescription';
module.exports = mongoose.model(modelName, DatasourceDescription_scheme);