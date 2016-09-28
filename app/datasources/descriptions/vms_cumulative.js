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
            uid: "vms survey",
            importRevision: 2,
            format: import_datatypes.DataSource_formats.CSV,
            title: "Visitor Motivation Survey",
            brandColor: "#03A678",
            urls: ["--"],
            description: "This data describes the motivations behind five different categories of users who have visisted museum websites.  Currently, this five different museums are represented in this data.",
            fe_listed: true,
            fe_displayTitleOverrides: {}, // this is needed to not through an error
            //
            //
            fn_new_rowPrimaryKeyFromRowObject: function (rowObject, rowIndex) {
                return "" + rowIndex + "-" + rowObject["id"]
            },
            raw_rowObjects_coercionScheme: {
                'Date': {
                    do: import_datatypes.Coercion_ops.ToDate,
                    opts: {
                        format: "YYYYMMDD" // e.g. "2009-03-21"
                    }
                },
                'Pageviews': {
                    do: import_datatypes.Coercion_ops.ToInteger
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
                lineGraph: true
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
            fe_chart_fieldsNotAvailableAsGroupByColumns: [
                "Minute_Index",
                "Date",
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
                "Pageviews",
                "Minute Index",
            ],
            fe_scatterplot_defaults: {
                xAxisField: 'Motivation',
                yAxisField: 'Pageviews'
            },
            fe_lineGraph_defaultGroupByColumnName_humanReadable: "Date",
            fe_lineGraph_fieldsNotAvailableAsGroupByColumns: [
                "Minute Index",
                "Motivation",
                "Hour",
                "Minute",
                "Sessions",
                "Session Duration",
                "Pageviews",
                "Pages Session",
                "Landing Page",
            ],
            fe_lineGraph_stackByColumnName_humanReadable: "Motivation",
            fe_lineGraph_defaultAggregateByColumnName_humanReadable: "Pageviews",
            fe_lineGraph_aggregateByColumnName_numberOfRecords_notAvailable: true,
            fe_lineGraph_mapping_dataSource_pKey: 'isb_library-r1',
            fe_lineGraph_mapping_dataSource_fields: {
                Date: 'Date'
            },
            fe_lineGraph_outputInFormat: {
                Date: {
                    format: "MMM DD"
                }
            }
        }
    ];
