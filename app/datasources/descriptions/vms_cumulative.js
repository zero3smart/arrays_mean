//
var winston = require('winston');
//
var import_datatypes = require('../utils/import_datatypes');
//
//
exports.Descriptions =
    [
        {
            filename: "VMS_Cumulative.csv",
            fileEncoding: "utf8", // the default
            uid: "vms_survey", 
            importRevision: 2,
            format: import_datatypes.DataSource_formats.CSV,
            title: "Visitor Motivation Survey",
            brandColor: "#03A678",
            urls: [ "--" ],
            description: "This data describes the motivations behind five different categories of users who have visisted museum websites.  Currently, five different museums are represented in this data.",
            fe_listed: true,
            fe_displayTitleOverrides: {}, // this is needed to not through an error
            //
            //
            fn_new_rowPrimaryKeyFromRowObject: function (rowObject, rowIndex) {
                return "" + rowIndex + "-" + rowObject["id"]
            },
            raw_rowObjects_coercionScheme:
            {
                'Date': {  //Use with format: "MM/DD/YYYY"
                // 'Date': {
                    do: import_datatypes.Coercion_ops.ToDate,
                    opts: {
                        // format: "MM/DD/YY" //LineGraph: results in a tick for every single day on x-axis
                        // format: 'YYYY'  //LineGraph: results in only 2 ticks on x-axis
                        format: 'YYYYMMDD'  //LineGraph: results in blank x-axis
                    }
                }
            },

            //
            //
            fe_designatedFields: {
                objectTitle: "id",
            },
            fe_views: {
                gallery: false,
                choropleth: false,
                chart: true,
                scatterplot: true,
                timeline: false,
                wordCloud: false,
                lineGraph: false
            },
            fe_default_view: 'chart',
            fe_excludeFields: [
                "id"
            ],
            fe_outputInFormat: {},
            fe_filters_fieldsNotAvailable: [
                "Landing Page",
                "Pages Session",
                "Session Duration",
                "Pageviews",
                "Hour",
                "Minute",
                "Sessions",
                "Minute Index",
                "Date"
            ],

            fe_filters_valuesToExcludeByOriginalKey: {
                _all: ["", null]
            },
            fe_chart_defaultGroupByColumnName_humanReadable: "Motivation",
            fe_chart_fieldsNotAvailableAsGroupByColumns:
            [
                    "Minute Index",
                    "Date",
                    "Date2",  //Remove later after finding solution to the date format issue
                    "Hour",
                    "Minute",
                    "Sessions",
                    "Session Duration",
                    "Pageviews",
                    "Pages Session",
                    "Landing Page",
            ],
            fe_chart_valuesToExcludeByOriginalKey: {
                _all: ["", null, "NULL", "(not specified)", "NA"],
            },
            fe_scatterplot_fieldsMap: {
                'Object Title': 'Motivation'
            },
            fe_scatterplot_fieldsNotAvailable: [
                "Institution",
                "Date",
                "Date2",  //delete after reworking CSV
                "Hour",
                "Minute",
                "Motivation",
                "Session Duration",
                "Pages Per Session",
                "Landing Page",
                "User Type", 
                "Traffic Type",
                "Operating System",
                "Minute Index",
                "City",
                "Region",
                "Country"
            ],
            fe_scatterplot_defaults: {
                xAxisField: 'Pageviews',
                yAxisField: 'Sessions'
            },

            fe_scatterplot_tooltip_term: "Visitor Records",
            ////////////

            fe_timeline_defaultSortByColumnName_humanReadable: "Date",
            fe_lineGraph_defaultGroupByColumnName_humanReadable: "Date",
            fe_lineGraph_keywordGroupBy: "Motivation",
            fe_lineGraph_fieldsNotAvailableAsGroupByColumns:
                [
                    "Institution",
                    "Motivation",
                    "Sessions",
                    "Traffic Type",
                    "Minute Index",
                    "Hour",
                    "Minute",
                    "Landing Page",
                ],
            fe_lineGraph_defaultAggregateByColumnName_humanReadable: "Pageviews",
            fe_lineGraph_aggregateByColumnName_numberOfRecords_notAvailable: true,
            fe_lineGraph_keywordLineColors: {
                'Explorer': '#33B1B1',
                'Facilitator': '#9533F8',
                'Professional': '#FEB600',
                'Recharger': '#99D8D8',
                'Seeker': '#4D8DFF',
            },
            // fe_lineGraph_mapping_dataSource_pKey: "vms_survey-r2",
            fe_lineGraph_mapping_dataSource_fields: {
                Year: "Date"
            }
        }
    ];
