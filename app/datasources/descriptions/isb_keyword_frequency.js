//
var winston = require('winston');
//
var import_datatypes = require('../utils/import_datatypes');
//
//
exports.Descriptions =
    [
        {
            filename: "Keyword_Frequency_Data_20160907_v2_rm - Sheet1.csv",
            fileEncoding: "utf8", // default
            uid: "ISB_keyword_frequency",
            team_id: "isb",
            importRevision: 1,
            format: import_datatypes.DataSource_formats.CSV,
            title: "The Rise of Keywords Related to Systems Biology",
            // brandColor: "#4A4A4A",
            urls: [ "http://www.ncbi.nlm.nih.gov/pubmed" ],
            description: "Institute for Systems Biology",
            logo: "/images/teams/isb_keyword_frequency.jpg",
            raw_rowObjects_coercionScheme:
            {
                'Year': {
                    do: import_datatypes.Coercion_ops.ToDate,
                    opts: {
                        format: "YYYY" // e.g. "2009-03-21"
                    }
                },
                "Count": {
                    do: import_datatypes.Coercion_ops.ToInteger
                }
            },
            fe_listed: true,
            //
            fn_new_rowPrimaryKeyFromRowObject: function(rowObject, rowIndex)
            {
                return "" + rowIndex + "-" + rowObject["Word"];
            },
            fe_designatedFields: 
            {
                objectTitle: "Word",
                // originalImageURL: "thumb_large",
                // medThumbImageURL: "thumb_small"
            },
            fe_views: {
                gallery: false,
                choropleth: false,
                chart: false,
                timeline: false,
                wordCloud: false,
                scatterplot: false,
                lineGraph: true
            },
            fe_default_view: 'lineGraph',
            fe_excludeFields: 
                [
                    
                ],
            fe_displayTitleOverrides:
            { // these are to be tuples - the values must be unique as well
                // "Author": "Author",
            },
            fe_filters_fabricatedFilters:
            [
                // {
                //     title: "Abstract Note",
                //     choices: [
                //         {
                //             title: "Has Abstract Note",
                //             $match: {
                //                 "rowParams.Abstract Note": {
                //                     $exists: true,
                //                     $nin: [ "", null ]
                //                 }
                //             }
                //         }
                //     ]
                // }
            ],
            fe_filters_valuesToExcludeByOriginalKey:
            {
                _all: [ "", null ]
            },
            //
            //
            fe_filters_default:
            {
                // "Abstract Note": [ "Has Abstract Note" ]
            },
            fe_filters_fieldsNotAvailable:
                [
                    "Year",
                    "Count"
                ],
            //
            //
            fe_filters_oneToOneOverrideWithValuesByTitleByFieldName:
            {
                // "Item Type": {
                //     "Book": "book",
                //     "Book Section": "bookSection",
                //     "Conference Paper": "conferencePaper",
                //     "Journal Article": "journalArticle",
                // }
            },
            //
            //
            fe_galleryItem_htmlForIconFromRowObjWhenMissingImage: function(rowObject)
            {
                // var category = rowObject.rowParams["Category"];
                // var iconSpanClass = undefined;
                // if (typeof category === 'undefined' || category === null || category === "") {
                //     iconSpanClass = "icon-tile-null";
                // } else {
                //     var lowerCasedCategory = category.toLowerCase().replace(' ', '-');
                //     if (lowerCasedCategory.length) {
                //         iconSpanClass = "icon-tile-isb-" + lowerCasedCategory;
                //     } else {
                //         winston.warn("⚠️  Unrecognized non-NULL lowercased category: ", gender + ". Defaulting.");
                //     }
                // }
                // //
                // if (typeof iconSpanClass === 'undefined') { // if for some reason…
                //     winston.warn("⚠️  Unable to derive icon span class for artist with no image in fe_galleryItem_htmlForIconFromRowObjWhenMissingImage. Using default of 'null' icon.");
                //     iconSpanClass = "icon-tile-null";
                // }
                // //
                // return '<span class="' + iconSpanClass + '"></span>';
            },
            //
            //
            fe_gallery_defaultSortByColumnName_humanReadable: "Object Title",
            //
            //
            fe_chart_defaultGroupByColumnName_humanReadable: "Categories",
            fe_chart_fieldsNotAvailableAsGroupByColumns:
                [
                    // "Title"
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
                    // "Decade",
                    // "Year"
                ],
            fe_timeline_defaultSortByColumnName_humanReadable: "Year",
            fe_timeline_fieldsNotAvailableAsSortByColumns:
                [
                    // "Item Type"
                ],
            //
            //
            fe_lineGraph_defaultGroupByColumnName_humanReadable: "Year",
            fe_lineGraph_fieldsNotAvailableAsGroupByColumns:
                [
                    "Word",
                    "Count"
                ],
            fe_lineGraph_defaultKeywordsColumnName_humanReadable: "Word",
            fe_lineGraph_keywordGroupBy: "Word",
            fe_lineGraph_keywordCountBy: "Count",
            fe_lineGraph_keywordLineColors: {
                Bioinformatics: '#33B1B1',
                'Computational Biology': '#9533F8',
                'Systems Biology': '#FEB600',
                Proteomics: '#99D8D8',
                'Single Nucleotide Protein': '#4D8DFF',
                'Personalized Medicine ': '#CA99FB',
                'Genome Wide Association Study': '#99BEFF'
            },

            fe_lineGraph_matched_dataSource_pKey: 'isb_library-r1',
            fe_lineGraph_matched_dataSource_fields_relationships: {
                Year: 'Publication Year'
            }
        }
    ];
