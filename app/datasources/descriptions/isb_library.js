//
var winston = require('winston');
//
var import_datatypes = require('../utils/import_datatypes');
//
//
exports.Descriptions =
    [
        {
            filename: "ISB_PublicationsData_MASTER_20160908_v1_jy.csv",
            fileEncoding: "utf8", // default
            uid: "isb_library",
            team_id: "isb",
            importRevision: 1,
            format: import_datatypes.DataSource_formats.CSV,
            title: "Articles Published by ISB since 2000",
            // brandColor: "#4A4A4A",
            urls: [ "https://www.systemsbiology.org" ],
            description: "Since 2000, when ISB was founded, our researchers have published more than 1300 papers across a range of journals, including more than 300 in Cell and Nature.",
            logo: "/images/teams/isb_library.jpg",
            raw_rowObjects_coercionScheme:
            {
                'Publication Year': {
                    do: import_datatypes.Coercion_ops.ToDate,
                    opts: {
                        format: "YYYY" // e.g. "2009-03-21"
                    }
                }
            },
            fe_listed: true,
            //
            fn_new_rowPrimaryKeyFromRowObject: function(rowObject, rowIndex)
            {
                return "" + rowIndex + "-" + rowObject["Key"];
            },
            fe_designatedFields: 
            {
                objectTitle: "Title",
                // originalImageURL: "thumb_large",
                // medThumbImageURL: "thumb_small"
            },
            fe_views: {
                gallery: true,
                choropleth: false,
                chart: true,
                timeline: true,
                wordCloud: false,
                scatterplot: false,
                lineGraph: false
            },
            fe_view_descriptions: {
                gallery: "The links below represent work published by ISB researchers from the year 2000 to the present. The publications fall under the following categories: brain, cancers, cell dynamics, P4 medicine, proteomics, computational biology, environment, infectious disease. Click on the funnel icon in the gray bar above to access the search filters. Switch to the chart or timeline view by clicking on the square icon."
            },
            fe_excludeFields: 
                [
                    "Key",
                    "ISBN",
                    "Date Added",
                    "Date Modified",
                    "Access Date",
                    "Num Pages",
                    "Number Of Volumes",
                    "Series Number",
                    "Series Text",
                    "Series Title",
                    "Place",
                    "Type",
                    "Archive",
                    "Archive Location",
                    "Call Number",
                    "File Attachment",
                    "Editor",
                    "Series Editor",
                    "Translator",
                    "Contributor",
                    "Attorney Agent",
                    "Book Author",
                    "Cast Member",
                    "Commenter",
                    "Composer",
                    "Cosponsor",
                    "Counsel",
                    "Interviewer",
                    "Producer",
                    "Recipient",
                    "Reviewed Author",
                    "Scriptwriter",
                    "Words By",
                    "Guest",
                    "Number",
                    "Edition",
                    "Running Time",
                    "Scale",
                    "Medium",
                    "Artwork Size",
                    "Filing Date",
                    "Application Number",
                    "Assignee",
                    "Issuing Authority",
                    "Country",
                    "Meeting Name",
                    "Conference Name",
                    "Court",
                    "References",
                    "Reporter",
                    "Legal Status",
                    "Priority Numbers",
                    "Programming Language",
                    "Version",
                    "System",
                    "Code",
                    "Code Number",
                    "Section",
                    "Session",
                    "Committee",
                    "History",
                    "Legislative Body",
                    "Series",
                    "Date",
                    "Publication Title",
                    "Journal Abbreviation"
                ],
            fe_displayTitleOverrides:
            { // these are to be tuples - the values must be unique as well
                // "Author": "Author",
            },
            fe_filters_fabricatedFilters:
            [
                {
                    title: "Abstract Note",
                    choices: [
                        {
                            title: "Has Abstract Note",
                            $match: {
                                "rowParams.Abstract Note": {
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
                "Abstract Note": [ "Has Abstract Note" ]
            },
            fe_filters_fieldsNotAvailable:
                [
                    "Author",
                    "Title",
                    "modified",
                    "ISSN",
                    "DOI",
                    "Abstract Note",
                    "Pages",
                    "Notes",
                    "Manual Tags",
                    "Automatic Tags",
                    "Extra",
                    "File Attachments",
                    "Link Attachments",
                    "Rights",
                    "Short Title",
                    "Url",
                    "Language",
                    "Publication Title",
                    "Date",
                    "Publisher",
                    "Volume",
                    "Library Catalog",
                    "Issue"
                ],
            fe_filters_fieldsMultiSelectable:
                [
                    "Publication Year",
                    "Journal",
                    "Categories"
                ],
            fe_filters_fieldsCommaSeparatedAsIndividual:
            [
                "Categories"
            ],
            //
            //
            fe_filters_oneToOneOverrideWithValuesByTitleByFieldName:
            {
                "Item Type": {
                    "Book": "book",
                    "Book Section": "bookSection",
                    "Conference Paper": "conferencePaper",
                    "Journal Article": "journalArticle",
                }
            },
            //
            //
            fe_galleryItem_htmlForIconFromRowObjWhenMissingImage: function(rowObject)
            {
                var categories = rowObject.rowParams["Categories"];
                var categoryArray = categories.split(',');
                var output = "";
                var iconSpanClass = undefined;
                var maxNumberOfIcons = 2;
                var numIconsClass = "category-icon-" + maxNumberOfIcons.toString();
                if (typeof categories === 'undefined' || categories === null || categories === "") {
                    iconSpanClass = "icon-tile-null";
                    output = '<span class="' + iconSpanClass + " " + numIconsClass + '"></span>';
                } else {
                    for (var i = 0; i < categoryArray.length; i++) {
                        var lowerCasedCategory = categoryArray[i].trim().toLowerCase().replace(' ', '-');

                        if (lowerCasedCategory.length) {
                            iconSpanClass = "icon-tile-isb-" + lowerCasedCategory;
                        } else {
                            winston.warn("⚠️  Unrecognized non-NULL lowercased category: ", categoryArray[i] + ". Defaulting.");
                        }

                        if (typeof iconSpanClass === 'undefined') { // if for some reason…
                            winston.warn("⚠️  Unable to derive icon span class for artist with no image in fe_galleryItem_htmlForIconFromRowObjWhenMissingImage. Using default of 'null' icon.");
                            iconSpanClass = "icon-tile-null";
                        }
                        
                        output += '<span class="' + iconSpanClass + " " + numIconsClass + '"></span>';
                    }
                }

                return output;
            },
            //
            //
            fe_gallery_defaultSortByColumnName_humanReadable: "Object Title",
            //
            //
            fe_chart_defaultGroupByColumnName_humanReadable: "Categories",
            fe_chart_fieldsNotAvailableAsGroupByColumns:
                [
                    "Title",
                    "DOI",
                    "Url",
                    "Abstract Note",
                    "Date",
                    "Pages",
                    "Short Title",
                    "Language",
                    "Rights",
                    "Extra",
                    "Notes",
                    "File Attachments",
                    "Link Attachments",
                    "Manual Tags",
                    "Automatic Tags",
                    "Author",
                    "ISSN",
                    "Volume",
                    "Issue",
                    "Publisher",
                    "Library Catalog"
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
                    "Year"
                ],
            fe_timeline_defaultSortByColumnName_humanReadable: "Publication Year",
            fe_timeline_fieldsNotAvailableAsSortByColumns:
                [
                    "Item Type",
                    "Author",
                    "Title",
                    "Publication Title",
                    "ISSN",
                    "DOI",
                    "Url",
                    "Abstract Note",
                    "Date",
                    "Pages",
                    "Issue",
                    "Volume",
                    "Journal Abbreviation",
                    "Short Title",
                    "Publisher",
                    "Language",
                    "Rights",
                    "Library Catalog",
                    "Extra",
                    "Notes",
                    "File Attachments",
                    "Link Attachments",
                    "Manual Tags",
                    "Automatic Tags",
                    "Country",
                    "Meeting Name",
                    "Conference Name",
                    "Court",
                    "Category",
                    "Categories",
                    "Journal"
                ],
            fe_timeline_tooltipDateFormat: "YYYY",
            //
            //
            fe_lineGraph_defaultGroupByColumnName_humanReadable: "Publication Year",
            fe_lineGraph_fieldsNotAvailableAsGroupByColumns:
                [
                    "Title",
                    "DOI",
                    "Url",
                    "Abstract Note",
                    "Date",
                    "Pages",
                    "Short Title",
                    "Language",
                    "Rights",
                    "Extra",
                    "Notes",
                    "File Attachments",
                    "Link Attachments",
                    "Manual Tags",
                    "Automatic Tags",
                    "Item Type",
                    "Author",
                    "Publication Title",
                    "ISSN",
                    "Issue",
                    "Volume",
                    "Publisher",
                    "Library Catalog",
                    "Category"
                ],
            fe_lineGraph_defaultKeywordsColumnName_humanReadable: "Category"
        }
    ];
