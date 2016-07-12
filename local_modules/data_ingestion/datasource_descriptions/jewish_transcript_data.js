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
            filename: "Jewish_Transcript_Filtered_WithImages_7122016.csv",
            fileEncoding: "utf8", // default
            uid: "jewish_transcript_data",
            importRevision: 1,
            format: import_datatypes.DataSource_formats.CSV,
            title: "Jewish Transcript Database",
            urls: [ "http://cdm16118.contentdm.oclc.org/cdm/landingpage/collection/p16118coll10" ],
            description: "Founded by Herman Horowitz in 1924, The Jewish Transcript documents the daily life of the Jewish community in Seattle as well as local and international events from the 1920's to present day.",
            fn_new_rowPrimaryKeyFromRowObject: function(rowObject, rowIndex)
            {
                return "" + rowIndex + "-" + rowObject["Identifier"];
            },
            raw_rowObjects_coercionScheme:
            {
                'Date': {
                    do: import_datatypes.Coercion_ops.ToDate,
                    opts: {
                        format: "MM/DD/YY" // e.g. "2009-03-21"
                    }
                },
                'Date created': {
                    do: import_datatypes.Coercion_ops.ToDate,
                    opts: {
                        format: "MM/DD/YY" // e.g. "2009-03-21"
                    }
                },
                'Date modified': {
                    do: import_datatypes.Coercion_ops.ToDate,
                    opts: {
                        format: "MM/DD/YY" // e.g. "2009-03-21"
                    }
                }
            },
            fe_listed: true,
            fe_displayTitleOverrides: {}, // this is needed to not through an error
            //
            fe_designatedFields: 
            {
                objectTitle: "Title",
                originalImageURL: "Fullsize",
                medThumbImageURL: "Medium"
            },
            fe_views: {
                gallery: true,
                choropleth: false,
                chart: true,
                scatterplot: true,
                timeline: true
            },
            fe_excludeFields: 
            [
                "Identifier",
                "File Name",
                "Neighborhood",
                "Volume/Issue",
                "Edition Label",
                "Notes",
                "Digitization Specifications",
                "File Format",
                "Type",
                "Local Type",
                "Copyright Status",
                "Reference URL",
                "CONTENTdm number",
                "CONTENTdm file name",
                "CONTENTdm file path",
                "Directory Name",
                "Fullsize",
                "Medium",
                "Pages_Title",
                "Pages_Date",
                "Pages_Decade",
                "Pages_Volume",
                "Pages_Issue",
                "Pages_Volume/Issue",
                "Pages_Type",
                "Pages_Local Type",
                "Pages_Date created",
                "Pages_Date modified",
                    "Pages_Reference URL",
                "Pages_CONTENTdm number",
                    "Pages_CONTENTdm file name",
                "Pages_CONTENTdm file path",

            ],
    
            fe_displayTitleOverrides:
            { // these are to be tuples - the values must be unique as well

            },
            fe_filters_fabricatedFilters:
            [
                {
                    title: "Image",
                    choices: [
                        {
                            title: "Has image",
                            $match: {
                                "rowParams.CONTENTdm file path": {
                                    $exists: true,
                                    $nin: [ "", null ]
                                }
                            }
                        }
                    ]
                },
                {
                    title: "Description",
                    choices: [
                        {
                            title: "Has description",
                            $match: {
                                "rowParams.description": {
                                    $exists: true,
                                    $nin: [ "", null ]
                                }
                            }
                        }
                    ]
                }
            ],
            fe_filters_valuesToExcludeByOriginalKey:
            {
                _all: [ "", null ]
            },
            //
            //
            fe_filters_default:
            {
                "Image": [ "Has image" ]
            },
            fe_filters_fieldsNotAvailable:
            [
                "Title",
                "Identifier",
                "Description",
                "Subjects",
                "Creator",
                "Neighborhood",
                "Date Labeled",
                "Publisher",
                "Publisher Location (NDNP)",
                "Edition Label",
                "Notes",
                "Directory Name",
                "Title [NDNP]",
                "Language",
                "Source",
                "Digital Tech",
                "Rights and Reproduction",
                "Collection",
                "Contributing Institution"
            ],
            //
            //
            fe_chart_defaultGroupByColumnName_humanReadable: "Decade",
            fe_chart_fieldsNotAvailableAsGroupByColumns:
            [
                "Title",
                "Identifier",
                "Subjects",
                "Creator",
                "Date Labeled",
                "Publisher",
                "Publisher Location (NDNP)",
                "Collection",
                "Contributing Institution",
                "Rights and Reproduction",
                "Source",
                "Digital Tech",
                "Language",
                "Transcript",
                "Title [NDNP]",
                "OCLC number"
            ],
            fe_chart_valuesToExcludeByOriginalKey:
            {
                _all: [ "", null, "NULL", "(not specified)", "NA" ],
            },
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
            fe_timeline_defaultSortByColumnName_humanReadable: "Date",
            fe_timeline_fieldsNotAvailableAsSortByColumns:
            [
                "Title",
                "Catalog Title",
                "Description",
                "Subjects",
                "Creator",
                "Date Labeled",
                "Decade",
                "Publisher",
                "Publisher Location (NDNP)",
                "Volume",
                "Issue",
                "Physical Measurements",
                "Collection",
                "Contributing Institution",
                "Rights and Reproduction",
                "Source",
                "Digital Tech",
                "Language",
                "Transcript",
                "Title [NDNP]",
                "LCCN",
                "Pages",
                "OCLC number"
            ]
        }
    ];
