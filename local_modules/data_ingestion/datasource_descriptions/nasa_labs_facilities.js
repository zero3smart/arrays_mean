//
var winston = require('winston');
//
var import_datatypes = require('../import_datatypes');
var import_processing = require('../import_processing');
//
//
exports.Descriptions =
    [
        {
            filename: "NASA_Labs_Facilities.csv",
            fileEncoding: "utf8", // the default
            uid: "nasa_labs_facilities",
            importRevision: 2,
            format: import_datatypes.DataSource_formats.CSV,
            title: "NASA Agency Data on User Facilities",
            brandColor: "#fe00ff",
            urls: [ "https://catalog.data.gov/dataset/agency-data-on-user-facilities" ],
            description: "The purpose of the Aerospace Technical Facility Inventory is to facilitate the sharing of specialized capabilities within the aerospace research/engineering community primarily within NASA, but also throughout the nation and the entire world. A second use is to assist in answering questions regarding NASA capabilities for future missions or various alternative scenarios regarding mission support to help the Agency maintain the right set of assets.",
            fe_displayTitleOverrides: {}, // this is needed to not through an error
            //
            //
            fn_new_rowPrimaryKeyFromRowObject: function(rowObject, rowIndex)
            {
                return "" + rowIndex + "-" + rowObject["ID"]
            },
            raw_rowObjects_coercionScheme:
            {
                'Record Date': {
                    do: import_datatypes.Coercion_ops.ToDate,
                    opts: {
                        format: "MM/DD/YYYY" // e.g. "2009-03-21"
                    }
                },
                'Last Update': {
                    do: import_datatypes.Coercion_ops.ToDate,
                    opts: {
                        format: "MM/DD/YYYY" // e.g. "2009-03-21"
                    }
                }
            },
            //
            //
            fe_designatedFields:
            {
                objectTitle: "Facility",
            },
            fe_views: {
                gallery: true,
                choropleth: false,
                chart: true,
                scatterplot: false,
                timeline: true,
                keywordFrequency: false
            },
            fe_excludeFields:
                [
                    "ID"
                ],
            fe_outputInFormat:
            {
                'Record Date': {
                    format: "MMMM Do, YYYY"
                },
                'Last Update': {
                    format: "MMMM Do, YYYY"
                }
            },
            fe_filters_fieldsNotAvailable:
                [
                    "Facility", // they're almost exclusively unique
                    "URL Link",
                    "Record Date",
                    "Last Update"
                ],
            fe_filters_valuesToExcludeByOriginalKey:
            {
                _all: [ "", null ]
            },
            //
            //
            fe_chart_defaultGroupByColumnName_humanReadable: "Agency",
            fe_chart_fieldsNotAvailableAsGroupByColumns:
                [
                    "Facility", // they're almost exclusively unique
                    "URL Link",
                    "Record Date",
                    "Last Update"
                ],
            fe_chart_valuesToExcludeByOriginalKey:
            {
                _all: [ "", null, "NULL", "(not specified)" ],
                Classification: [ "(not assigned)" ]
            },
            //
            //
            fe_choropleth_defaultMapByColumnName_humanReadable: "State",
            fe_choropleth_fieldsNotAvailableAsMapByColumns:
                [
                    "Agency",
                    "Center",
                    "Center Search Status",
                    "Facility",
                    "Occupied",
                    "Status",
                    "URL Link",
                    "Record Date",
                    "Last Update",
                    "Address",
                    "City",
                    "State",
                    "ZIP",
                    "Country",
                    "Contact",
                    "Mail Stop",
                    "Phone"
                ],
            //
            //
            fe_timeline_defaultGroupByColumnName_humanReadable: "Year",
            fe_timeline_durationsAvailableForGroupBy:
                [
                    "Decade",
                    "Year",
                    "Month",
                    "Day"
                ],
            fe_timeline_defaultSortByColumnName_humanReadable: "Record Date",
            fe_timeline_fieldsNotAvailableAsSortByColumns:
                [
                    "Agency",
                    "Center",
                    "Center Search Status",
                    "Facility",
                    "Occupied",
                    "Status",
                    "URL Link",
                    "Address",
                    "City",
                    "State",
                    "ZIP",
                    "Country",
                    "Contact",
                    "Mail Stop",
                    "Phone"
                ],
        }
    ];
