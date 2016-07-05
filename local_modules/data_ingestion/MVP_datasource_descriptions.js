//
var winston = require('winston');
//
var import_datatypes = require('./import_datatypes');
var import_processing = require('./import_processing');
//
//
exports.Descriptions = 
[
    //
    // Production - Invisible - Nationality <-> Country - 
    // {
    //     filename: "Countries-to-Demonyms.csv",
    //     fileEncoding: "utf8", // default
    //     uid: "countries_to_demonyms",
    //     importRevision: 1,
    //     format: import_datatypes.DataSource_formats.CSV,
    //     title: "Countries to Demonyms",
    //     fe_visible: false,
    //     //
    //     fn_new_rowPrimaryKeyFromRowObject: function(rowObject, rowIndex)
    //     {
    //         return "" + rowIndex + "-" + rowObject["ISO 3166 Code"]
    //     }
    // },
    // //
    // // Production - Visible - MoMA dataset
    // {
    //     filename: "MoMA_Artists_v1_jy.csv",
    //     fileEncoding: "utf8", // the default
    //     uid: "moma_artists",
    //     importRevision: 1,
    //     format: import_datatypes.DataSource_formats.CSV,
    //     title: "MoMA Artists",
    //     urls: [ "http://zenodo.org/record/46902" ],
    //     description: "Basic catalog information for artists with works in the collection of The Museum of Modern Art (MoMA), including artist name, nationality, gender, birth year, death year, Wiki QID and Getty ULAN ID. ",
    //     //
    //     //
    //     fn_new_rowPrimaryKeyFromRowObject: function(rowObject, rowIndex)
    //     {
    //         return "" + rowIndex + "-" + rowObject["ConstituentID"]
    //     },
    //     raw_rowObjects_coercionScheme:
    //     {
    //         BeginDate: {
    //             do: import_datatypes.Coercion_ops.ToDate,
    //             opts: import_datatypes.Coercion_optionsPacks.ToDate.FourDigitYearOnly
    //         },
    //         EndDate: {
    //             do: import_datatypes.Coercion_ops.ToDate,
    //             opts: import_datatypes.Coercion_optionsPacks.ToDate.FourDigitYearOnly
    //         }
    //     },
    //     //
    //     //
    //     afterImportingAllSources_generate:
    //     [
    //         {
    //             field: "Country of Origin",
    //             singular: true,
    //             by: {
    //                 doing: import_processing.Ops.Join, 
    //                 matchFn: import_processing.MatchFns.LocalContainsForeignString, // look for Demonym in Nationality, rather than Nationality in Demonym
    //                 findingMatchOnFields: [ "Demonym 1", "Demonym 2", "Demonym 3" ],
    //                 ofOtherRawSrcUID: "countries_to_demonyms",
    //                 andOtherRawSrcImportRevision: 1,
    //                 withLocalField: "Nationality", 
    //                 obtainingValueFromField: "Name"
    //             }
    //         },
    //         {
    //             field: "Artworks",
    //             singular: false,
    //             relationship: true, // obtaining the _id instead of a field value, and will be hydrated with
    //             // associated objects on API data prep instead of being sent along as primitive values
    //             by: {
    //                 doing: import_processing.Ops.Join,
    //                 matchFn: import_processing.MatchFns.LocalEqualsForeignString,
    //                 findingMatchOnFields: [ "Artist" ],
    //                 ofOtherRawSrcUID: "moma_artworks",
    //                 andOtherRawSrcImportRevision: 2,
    //                 withLocalField: "DisplayName"
    //                 // note we do not obtain a value from a field since this is a relationship-forming join
    //                 // and a flag here saying "obtainingRelationship=true" would be redundant
    //             }
    //         }
    //     ],
    //     //
    //     //
    //     fe_designatedFields: 
    //     {
    //         objectTitle: "DisplayName",
    //         originalImageURL: null, // not strictly necessary to define as null but done for explicitness
    //         medThumbImageURL: null // not strictly necessary to define as null but done for explicitness
    //     },
    //     fe_excludeFields: 
    //     [
    //         "ConstituentID" // not sure if we really want to exclude this
    //     ],
    //     fe_displayTitleOverrides:
    //     { 
    //         // these are to be tuples - the values must be unique as well
    //         "Code" : "Gender",
    //         "DisplayDate" : "Bio",
    //         "BeginDate" : "Date of Birth",
    //         "EndDate" : "Date of Death"
    //     },
    //     //
    //     fe_filters_fieldsNotAvailable:
    //     [
    //         "DisplayName", // because they're effectively unique
    //         "Artworks", // it's an array of doc ids
    //         "DisplayDate",
    //         "BeginDate",
    //         "EndDate",
    //         "Wiki QID",
    //         "ULAN",
    //     ],
    //     fe_filters_oneToOneOverrideWithValuesByTitleByFieldName: 
    //     {
    //         "Gender": {
    //             "Male": "Male",
    //             "Female": "Female",
    //             "Not Specified": "NULL"
    //         }
    //     },
    //     //
    //     fe_filters_valuesToExcludeByOriginalKey:
    //     {
    //         _all: [ "", null ],
    //         "Nationality" : [ "NULL", "Nationality unknown", "nationality unknown", "Nationality Unknown" ]
    //     },
    //     //
    //     fe_chart_defaultGroupByColumnName_humanReadable: "Nationality",
    //     fe_chart_fieldsNotAvailableAsGroupByColumns:
    //     [
    //         "DisplayName", // because they're effectively unique
    //         "Artworks", // it's an array of doc ids
    //         "DisplayDate",
    //         "Wiki QID",
    //         "ULAN"
    //     ],
    //     fe_chart_valuesToExcludeByOriginalKey:
    //     {
    //         _all: [ "", null, "NULL", "(not specified)" ],
    //         Nationality: [ "Nationality unknown", "nationality unknown", "Nationality Unknown" ]
    //     },
    //     //
    //     //
    //     fe_choropleth_defaultMapByColumnName_humanReadable: "Country of Origin",
    //     fe_choropleth_fieldsNotAvailableAsMapByColumns:
    //     [
    //         "DisplayName",
    //         "Artworks", // it's an array of doc ids
    //         "Code",
    //         "Nationality",
    //         "DisplayDate",
    //         "BeginDate",
    //         "EndDate",
    //         "Wiki QID",
    //         "ULAN"
    //     ],
    //     //
    //     //
    //     fe_galleryItem_htmlForIconFromRowObjWhenMissingImage: function(rowObject)
    //     {
    //         var gender = rowObject.rowParams["Code"];
    //         var iconSpanClass = undefined;
    //         if (typeof gender === 'undefined' || gender == null || gender == "") {
    //             iconSpanClass = "icon-tile-null";
    //         } else if (gender === "NULL") {
    //             iconSpanClass = "icon-tile-null";
    //         } else {
    //             var lowerCasedGender = gender.toLowerCase();
    //             if (lowerCasedGender == "male" || lowerCasedGender == "female") {
    //                 iconSpanClass = "icon-tile-" + lowerCasedGender;
    //             } else {
    //                 winston.warn("⚠️  Unrecognized non-NULL lowercased gender: ", gender + ". Defaulting.");
    //             }
    //         }
    //         //
    //         if (typeof iconSpanClass === 'undefined') { // if for some reason…
    //             winston.warn("⚠️  Unable to derive icon span class for artist with no image in fe_galleryItem_htmlForIconFromRowObjWhenMissingImage. Using default of 'null' icon.");
    //             iconSpanClass = "icon-tile-null";
    //         }
    //         //
    //         return '<span class="' + iconSpanClass + ' color-gender"></span>';
    //     },
    //     //
    //     fe_objectShow_customHTMLOverrideFnsByColumnName:
    //     {
    //         "Artworks": function(rowObject, eachValue)
    //         {
    //             var relationshipObjectShowLink = "/array/" + eachValue.srcDocPKey + "/" + eachValue._id;
    //             var openingTag = '<a href="' + relationshipObjectShowLink + '" class="color-brand">';
    //             var tagContent = eachValue.rowParams.Title;
    //             var closingTag = '</a>';
    //             //
    //             return openingTag + tagContent + closingTag;
    //         }
    //     }
    // },
    // {
    //     filename: "MoMA_Artworks_v2_jy.csv",
    //     fileEncoding: "utf8", // the default
    //     uid: "moma_artworks",
    //     importRevision: 2,
    //     format: import_datatypes.DataSource_formats.CSV,
    //     title: "MoMA Artworks",
    //     urls: [ "https://github.com/MuseumofModernArt/collection" ],
    //     description: "This research dataset contains 126,713 records, representing all of the works that have been accessioned into MoMA’s collection and cataloged in our database.",
    //     //
    //     //
    //     fn_new_rowPrimaryKeyFromRowObject: function(rowObject, rowIndex)
    //     {
    //         return "" + rowIndex + "-" + rowObject["ObjectID"]
    //     },
    //     raw_rowObjects_coercionScheme:
    //     {
    //         DateAcquired: {
    //             do: import_datatypes.Coercion_ops.ToDate,
    //             opts: {
    //                 format: "YYYY-MM-DD" // e.g. "2009-03-21"
    //             }
    //         },
    //         Date: {
    //             do: import_datatypes.Coercion_ops.ToDate,
    //             opts: import_datatypes.Coercion_optionsPacks.ToDate.FourDigitYearOnly
    //         }
    //     },
    //     //
    //     //
    //     fe_designatedFields: 
    //     {
    //         objectTitle: "Title",
    //         originalImageURL: "imgURL_original",
    //         medThumbImageURL: "imgURL_gridThumb"
    //     },
    //     fe_excludeFields: 
    //     [
    //         "ObjectID", // not sure if we really want to exclude this
    //         //
    //         "imgURL_original", 
    //         "imgURL_gridThumb"
    //     ],
    //     fe_displayTitleOverrides:
    //     { // these are to be tuples - the values must be unique as well
    //         "CuratorApproved": "Curator Approved",
    //         "DateAcquired": "Date Acquired",
    //         "CreditLine": "Credit Line",
    //         "ArtistBio": "Artist Bio",
    //         "MoMANumber": "MoMA Number"
    //     },
    //     fe_outputInFormat:
    //     {
    //         DateAcquired: {
    //             format: "MMMM Do, YYYY"
    //         }
    //     },
    //     //
    //     fe_filters_default:
    //     {
    //         "Image": [ "Has image" ]
    //     },
    //     fe_filters_fieldsNotAvailable:
    //     [
    //         "Title", // they're almost exclusively unique
    //         "ArtistBio",
    //         "Dimensions",
    //         "CreditLine",
    //         "MoMANumber",
    //         "DateAcquired",
    //         "URL",
    //         "Date"
    //     ],
    //     fe_filters_oneToOneOverrideWithValuesByTitleByFieldName: 
    //     {
    //         "Artist Gender": {
    //             "Male": "Male",
    //             "Female": "Female",
    //             "Not Specified": "NULL"
    //         }
    //     },
    //     fe_filters_valuesToExcludeByOriginalKey:
    //     {
    //         _all: [ "", null ]
    //     },
    //     fe_filters_fabricatedFilters:
    //     [
    //         {
    //             title: "Image",
    //             choices: [
    //                 {
    //                     title: "Has image",
    //                     $match: {
    //                         "rowParams.imgURL_gridThumb": {
    //                             $exists: true,
    //                             $nin: [ "", null ]
    //                         }
    //                     }
    //                 }
    //             ]
    //         },
    //         {
    //             title: "Object Title",
    //             choices: [
    //                 {
    //                     title: "Has Title",
    //                     $match: {
    //                         "rowParams.Title": {
    //                             $exists: true,
    //                             $nin: [ "", null ]
    //                         }
    //                     }
    //                 }
    //             ]
    //         }
    //     ],
    //     //
    //     //
    //     fe_galleryItem_htmlForIconFromRowObjWhenMissingImage: function(rowObject)
    //     {
    //         var gender = rowObject.rowParams["Artist Gender"];
    //         var iconSpanClass = undefined;
    //         if (typeof gender === 'undefined' || gender == null || gender == "") {
    //             iconSpanClass = "icon-tile-null";
    //         } else if (gender === "NULL") {
    //             iconSpanClass = "icon-tile-null";
    //         } else {
    //             var lowerCasedGender = gender.toLowerCase();
    //             if (lowerCasedGender == "male" || lowerCasedGender == "female") {
    //                 iconSpanClass = "icon-tile-" + lowerCasedGender;
    //             } else {
    //                 winston.warn("⚠️  Unrecognized non-NULL lowercased gender: ", gender + ". Defaulting.");
    //             }
    //         }
    //         //
    //         if (typeof iconSpanClass === 'undefined') { // if for some reason…
    //             winston.warn("⚠️  Unable to derive icon span class for artist with no image in fe_galleryItem_htmlForIconFromRowObjWhenMissingImage. Using default of 'null' icon.");
    //             iconSpanClass = "icon-tile-null";
    //         }
    //         //
    //         return '<span class="' + iconSpanClass + ' color-gender"></span>';
    //     },
    //     //
    //     //
    //     fe_chart_defaultGroupByColumnName_humanReadable: "Artist Gender",
    //     fe_chart_fieldsNotAvailableAsGroupByColumns:
    //     [
    //         "Title", // they're almost exclusively unique
    //         "ArtistBio",
    //         "Dimensions",
    //         "CreditLine",
    //         "MoMANumber",
    //         "DateAcquired",
    //         "URL"
    //     ],
    //     fe_chart_valuesToExcludeByOriginalKey:
    //     {
    //         _all: [ "", null, "NULL", "(not specified)" ],
    //         Classification: [ "(not assigned)" ]
    //     },
    //     //
    //     //
    //     fe_choropleth_defaultMapByColumnName_humanReadable: "Country of Origin",
    //     fe_choropleth_fieldsNotAvailableAsMapByColumns:
    //     [
    //         "Title",
    //         "Artist",
    //         "Artist Gender",
    //         "ArtistBio",
    //         "Dimensions",
    //         "CreditLine",
    //         "MoMANumber",
    //         "Date",
    //         "DateAcquired",
    //         "URL",
    //         "CuratorApproved",
    //         "Classification",
    //         "Department",
    //         "Medium"
    //     ],
    //     //
    //     //
    //     afterImportingAllSources_generate: 
    //     [
    //         {
    //             field: "Artist Gender",
    //             singular: true, // there is only one gender per artwork's artist
    //             by: {
    //                 doing: import_processing.Ops.Join,
    //                 matchFn: import_processing.MatchFns.LocalEqualsForeignString,
    //                 findingMatchOnFields: [ "DisplayName" ],
    //                 ofOtherRawSrcUID: "moma_artists",
    //                 andOtherRawSrcImportRevision: 1,
    //                 withLocalField: "Artist",
    //                 obtainingValueFromField: "Code"
    //             }
    //         },
    //         {
    //             field: "Country of Origin",
    //             singular: true,
    //             by: {
    //                 doing: import_processing.Ops.Join, 
    //                 matchFn: import_processing.MatchFns.LocalContainsForeignString, // look for Demonym in ArtistBio, rather than ArtistBio in Demonym
    //                 findingMatchOnFields: [ "Demonym 1", "Demonym 2", "Demonym 3" ],
    //                 ofOtherRawSrcUID: "countries_to_demonyms",
    //                 andOtherRawSrcImportRevision: 1,
    //                 withLocalField: "ArtistBio", 
    //                 obtainingValueFromField: "Name"
    //             }
    //         }
    //     ],
    //     //
    //     //
    //     afterImportingAllSources_generateByScraping:
    //     [
    //         {
    //             htmlSourceAtURLInField: "URL",
    //             imageSrcSetInSelector: "img.sov-hero__image-container__image@srcset",
    //             prependToImageURLs: "http://www.moma.org", // since the urls are like "/media/…", not "http://…/media/…"
    //             useAndHostSrcSetSizeByField: {
    //                 "imgURL_original": {
    //                     size: "2000w"
    //                 },
    //                 "imgURL_gridThumb": {
    //                     size: "640w"
    //                 }
    //             }
    //         }
    //     ]
    //     // //
    //     // //
    //     // // This is implemented but currently not used (it was built for scraping)
    //     // afterGeneratingProcessedRowObjects_setupBefore_eachRowFn: function(appCtx, eachCtx, cb)
    //     // {
    //     //     // Setup each ctx, such as the batch operation
    //     //     cb(null);
    //     // },
    //     // //
    //     // afterGeneratingProcessedRowObjects_eachRowFns:
    //     // [
    //     //     function(appCtx, eachCtx, rowDoc, cb)
    //     //     {
    //     //         // console.log("A row", rowDoc)
    //     //         // perform derivations and add update operations to batch operation in eachCtx
    //     //         cb(null);
    //     //     }
    //     // ],
    //     // //
    //     // afterGeneratingProcessedRowObjects_afterIterating_eachRowFn: function(appCtx, eachCtx, cb)
    //     // {
    //     //     // Finished iterating … execute the batch operation
    //     //     cb(null);
    //     // }
    //     // //
    //     // //
    // },
    // {
    //     filename: "NASA_Labs_Facilities.csv",
    //     fileEncoding: "utf8", // the default
    //     uid: "nasa_labs_facilities",
    //     importRevision: 2,
    //     format: import_datatypes.DataSource_formats.CSV,
    //     title: "NASA Agency Data on User Facilities",
    //     urls: [ "https://catalog.data.gov/dataset/agency-data-on-user-facilities" ],
    //     description: "The purpose of the Aerospace Technical Facility Inventory is to facilitate the sharing of specialized capabilities within the aerospace research/engineering community primarily within NASA, but also throughout the nation and the entire world. A second use is to assist in answering questions regarding NASA capabilities for future missions or various alternative scenarios regarding mission support to help the Agency maintain the right set of assets.",
    //     fe_displayTitleOverrides: {}, // this is needed to not through an error
    //     //
    //     //
    //     fn_new_rowPrimaryKeyFromRowObject: function(rowObject, rowIndex)
    //     {
    //         return "" + rowIndex + "-" + rowObject["ID"]
    //     },
    //     raw_rowObjects_coercionScheme:
    //     {
    //         'Record Date': {
    //             do: import_datatypes.Coercion_ops.ToDate,
    //             opts: {
    //                 format: "YYYY-MM-DD" // e.g. "2009-03-21"
    //             }
    //         },
    //         'Last Update': {
    //             do: import_datatypes.Coercion_ops.ToDate,
    //             opts: {
    //                 format: "YYYY-MM-DD" // e.g. "2009-03-21"
    //             }
    //         }
    //     },
    //     //
    //     //
    //     fe_designatedFields: 
    //     {
    //         objectTitle: "Facility",
    //     },
    //     fe_excludeFields: 
    //     [
    //         "ID"
    //     ],
    //     fe_outputInFormat:
    //     {
    //         'Record Date': {
    //             format: "MMMM Do, YYYY"
    //         },
    //         'Last Update': {
    //             format: "MMMM Do, YYYY"
    //         }
    //     },
    //     fe_filters_fieldsNotAvailable:
    //     [
    //         "Facility", // they're almost exclusively unique
    //         "URL Link",
    //         "Record Date",
    //         "Last Update"
    //     ],
    //     fe_filters_valuesToExcludeByOriginalKey:
    //     {
    //         _all: [ "", null ]
    //     },
    //     //
    //     //
    //     fe_chart_defaultGroupByColumnName_humanReadable: "Agency",
    //     fe_chart_fieldsNotAvailableAsGroupByColumns:
    //     [
    //         "Facility", // they're almost exclusively unique
    //         "URL Link",
    //         "Record Date",
    //         "Last Update"
    //     ],
    //     fe_chart_valuesToExcludeByOriginalKey:
    //     {
    //         _all: [ "", null, "NULL", "(not specified)" ],
    //         Classification: [ "(not assigned)" ]
    //     },
    //     //
    //     //
    //     fe_choropleth_defaultMapByColumnName_humanReadable: "State",
    //     fe_choropleth_fieldsNotAvailableAsMapByColumns:
    //     [
    //         "Agency",
    //         "Center",
    //         "Center Search Status",
    //         "Facility",
    //         "Occupied",
    //         "Status",
    //         "URL Link",
    //         "Record Date",
    //         "Last Update",
    //         "Address",
    //         "City",
    //         "State",
    //         "ZIP",
    //         "Country",
    //         "Contact",
    //         "Mail Stop",
    //         "Phone"
    //     ]
    // },
    {
        filename: "Marvel_Character_Database.csv",
        fileEncoding: "utf8", // default
        uid: "marvel_character_database",
        importRevision: 1,
        format: import_datatypes.DataSource_formats.CSV,
        title: "Marvel Character Database",
        urls: [ "http://developer.marvel.com/docs" ],
        description: "Find profiles for your favorite Marvel characters in Marvel.com's character database, including info on first appearances, key issues, and basic statistics.",
        fe_listed: true,
        fe_displayTitleOverrides: {}, // this is needed to not through an error
        //
        fn_new_rowPrimaryKeyFromRowObject: function(rowObject, rowIndex)
        {
            return "" + rowIndex + "-" + rowObject["id"]
        },
        fe_designatedFields: 
        {
            objectTitle: "name",
            originalImageURL: "thumb_large",
            medThumbImageURL: "thumb_small"
        },
        fe_views: {
            gallery: true,
            choropleth: false,
            chart: true,
            timeline: true
        },
        fe_excludeFields: 
        [
            "id",
            // "name",
            // "description",
            "modified",
            "thumbnail_path",
            "thumbnail_extension",
            "resourceURI",
            "comics_available",
            "comics_collectionURI",
            "comics_items_0_resourceURI",
            "comics_items_0_name",
            "comics_items_1_resourceURI",
            "comics_items_1_name",
            "comics_items_2_resourceURI",
            "comics_items_2_name",
            "comics_items_3_resourceURI",
            "comics_items_3_name",
            "comics_items_4_resourceURI",
            "comics_items_4_name",
            "comics_items_5_resourceURI",
            "comics_items_5_name",
            "comics_items_6_resourceURI",
            "comics_items_6_name",
            "comics_items_7_resourceURI",
            "comics_items_7_name",
            "comics_items_8_resourceURI",
            "comics_items_8_name",
            "comics_items_9_resourceURI",
            "comics_items_9_name",
            "comics_items_10_resourceURI",
            "comics_items_10_name",
            "comics_returned",
            "series_available",
            "series_collectionURI",
            "series_items_0_resourceURI",
            "series_items_0_name",
            "series_items_1_resourceURI",
            "series_items_1_name",
            "series_returned",
            "stories_available",
            "stories_collectionURI",
            "stories_items_0_resourceURI",
            "stories_items_0_name",
            "stories_items_0_type",
            "stories_items_1_resourceURI",
            "stories_items_1_name",
            "stories_items_1_type",
            "stories_items_2_resourceURI",
            "stories_items_2_name",
            "stories_items_2_type",
            "stories_items_3_resourceURI",
            "stories_items_3_name",
            "stories_items_3_type",
            "stories_items_4_resourceURI",
            "stories_items_4_name",
            "stories_items_4_type",
            "stories_items_5_resourceURI",
            "stories_items_5_name",
            "stories_items_5_type",
            "stories_items_6_resourceURI",
            "stories_items_6_name",
            "stories_items_6_type",
            "stories_items_7_resourceURI",
            "stories_items_7_name",
            "stories_items_7_type",
            "stories_items_8_resourceURI",
            "stories_items_8_name",
            "stories_items_8_type",
            "stories_items_9_resourceURI",
            "stories_items_9_name",
            "stories_items_9_type",
            "stories_items_10_resourceURI",
            "stories_items_10_name",
            "stories_items_10_type",
            "stories_items_11_resourceURI",
            "stories_items_11_name",
            "stories_items_11_type",
            "stories_items_12_resourceURI",
            "stories_items_12_name",
            "stories_items_12_type",
            "stories_items_13_resourceURI",
            "stories_items_13_name",
            "stories_items_13_type",
            "stories_items_14_resourceURI",
            "stories_items_14_name",
            "stories_items_14_type",
            "stories_items_15_resourceURI",
            "stories_items_15_name",
            "stories_items_15_type",
            "stories_items_16_resourceURI",
            "stories_items_16_name",
            "stories_items_16_type",
            "stories_returned",
            "events_available",
            "events_collectionURI",
            "events_items_0_resourceURI",
            "events_items_0_name",
            "events_returned",
            "urls_0_type",
            "urls_0_url",
            "urls_1_type",
            "urls_1_url",
            "urls_2_type",
            "urls_2_url",
            "comics_items_11_resourceURI",
            "comics_items_11_name",
            "comics_items_12_resourceURI",
            "comics_items_12_name",
            "comics_items_13_resourceURI",
            "comics_items_13_name",
            "comics_items_14_resourceURI",
            "comics_items_14_name",
            "comics_items_15_resourceURI",
            "comics_items_15_name",
            "comics_items_16_resourceURI",
            "comics_items_16_name",
            "comics_items_17_resourceURI",
            "comics_items_17_name",
            "comics_items_18_resourceURI",
            "comics_items_18_name",
            "comics_items_19_resourceURI",
            "comics_items_19_name",
            "series_items_2_resourceURI",
            "series_items_2_name",
            "series_items_3_resourceURI",
            "series_items_3_name",
            "series_items_4_resourceURI",
            "series_items_4_name",
            "series_items_5_resourceURI",
            "series_items_5_name",
            "series_items_6_resourceURI",
            "series_items_6_name",
            "series_items_7_resourceURI",
            "series_items_7_name",
            "series_items_8_resourceURI",
            "series_items_8_name",
            "series_items_9_resourceURI",
            "series_items_9_name",
            "series_items_10_resourceURI",
            "series_items_10_name",
            "series_items_11_resourceURI",
            "series_items_11_name",
            "series_items_12_resourceURI",
            "series_items_12_name",
            "series_items_13_resourceURI",
            "series_items_13_name",
            "series_items_14_resourceURI",
            "series_items_14_name",
            "series_items_15_resourceURI",
            "series_items_15_name",
            "series_items_16_resourceURI",
            "series_items_16_name",
            "series_items_17_resourceURI",
            "series_items_17_name",
            "series_items_18_resourceURI",
            "series_items_18_name",
            "series_items_19_resourceURI",
            "series_items_19_name",
            "stories_items_17_resourceURI",
            "stories_items_17_name",
            "stories_items_17_type",
            "stories_items_18_resourceURI",
            "stories_items_18_name",
            "stories_items_18_type",
            "stories_items_19_resourceURI",
            "stories_items_19_name",
            "stories_items_19_type",
            "events_items_1_resourceURI",
            "events_items_1_name",
            "events_items_2_resourceURI",
            "events_items_2_name",
            "events_items_3_resourceURI",
            "events_items_3_name",
            "events_items_4_resourceURI",
            "events_items_4_name",
            "events_items_5_resourceURI",
            "events_items_5_name",
            "events_items_6_resourceURI",
            "events_items_6_name",
            "events_items_7_resourceURI",
            "events_items_7_name",
            "events_items_8_resourceURI",
            "events_items_8_name",
            "events_items_9_resourceURI",
            "events_items_9_name",
            "events_items_10_resourceURI",
            "events_items_10_name",
            "events_items_11_resourceURI",
            "events_items_11_name",
            "events_items_12_resourceURI",
            "events_items_12_name",
            "events_items_13_resourceURI",
            "events_items_13_name",
            "events_items_14_resourceURI",
            "events_items_14_name",
            "events_items_15_resourceURI",
            "events_items_15_name",
            "events_items_16_resourceURI",
            "events_items_16_name",
            "events_items_17_resourceURI",
            "events_items_17_name",
            "events_items_18_resourceURI",
            "events_items_18_name",
            "events_items_19_resourceURI",
            "events_items_19_name",
            "thumb_small",
            "thumb_large",
        ],
        fe_displayTitleOverrides:
        { // these are to be tuples - the values must be unique as well
            "name": "Name",
            "description": "Description",
        },
        fe_filters_fabricatedFilters:
        [
            {
                title: "Image",
                choices: [
                    {
                        title: "Has image",
                        $match: {
                            "rowParams.thumb_large": {
                                $exists: true,
                                $nin: [ "http://i.annihil.us/u/prod/marvel/i/mg/b/40/image_not_available.jpg", null ]
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
            "events_available",
            "series_available",
            "stories_available",
            "comics_available",
            "description",
            "name",
        ],
        //
        //
        fe_chart_defaultGroupByColumnName_humanReadable: "Comics",
        fe_chart_fieldsNotAvailableAsGroupByColumns:
        [
            "name",
            "description",
        ],
        fe_chart_valuesToExcludeByOriginalKey:
        {
            _all: [ "", null, "NULL", "(not specified)", "NA" ],
        },
        //
        //
        fe_timeline_defaultGroupByColumnName_humanReadable: "Decade",
        fe_timeline_durationsAvailableForGroupBy:
        [
            "Decade",
            "Year",
            "Month",
            "Day"
        ],
        fe_timeline_defaultSortByColumnName_humanReadable: "Last Modified",
        fe_timeline_fieldsNotAvailableAsSortByColumns:
        [
            "events_available",
            "series_available",
            "stories_available",
            "comics_available",
            "description",
            "name",
            "comics"
        ],
        //
        //
        // This is implemented but currently not used (it was built for scraping)
        afterGeneratingProcessedRowObjects_setupBefore_eachRowFn: function(appCtx, eachCtx, cb)
        {
            // Setup each ctx, such as the batch operation
            // Setup each ctx, such as the batch operation
            var srcDoc_uid = "marvel_character_database";
            var srcDoc_importRevision = 1; // INSERT YOUR IMPORT REVISION
            // An accessor factory function that just combines the values in a 
                        
            var srcDoc_pKey = appCtx.raw_source_documents_controller.NewCustomPrimaryKeyStringWithComponents(srcDoc_uid, srcDoc_importRevision);           
            var forThisDataSource_mongooseContext = appCtx.processed_row_objects_controller.Lazy_Shared_ProcessedRowObject_MongooseContext(srcDoc_pKey);            
            // ^ there is only one mongooseContext in raw_source_documents_controller because there is only one src docs collection,
            // but there are many mongooseContexts derivable/in raw_row_objects_controller because there is one collection of processed row objects per src doc
            var forThisDataSource_rowObjects_modelName = forThisDataSource_mongooseContext.Model.modelName;
            var forThisDataSource_RawRowObject_model = forThisDataSource_mongooseContext.Model.model;
            var forThisDataSource_nativeCollection = forThisDataSource_mongooseContext.Model.collection;
        
            
            // specify (and cache/store) an operating spec for the field merge operation
            eachCtx.mergeFieldsValuesIntoFieldArray_generateFieldNamed__Comics = "Comics";
            eachCtx.mergeFieldsValuesIntoFieldArray_withValuesInFieldsNamed__Comics = 
            [
                "comics_items_0_name",
                "comics_items_1_name",
                "comics_items_2_name",
                "comics_items_3_name",
                "comics_items_4_name",
                "comics_items_5_name",
                "comics_items_6_name",
                "comics_items_7_name",
                "comics_items_8_name",
                "comics_items_9_name",
                "comics_items_10_name",
                "comics_items_11_name",
                "comics_items_12_name",
                "comics_items_13_name",
                "comics_items_14_name",
                "comics_items_15_name",
                "comics_items_16_name",
                "comics_items_17_name",
                "comics_items_18_name",
                "comics_items_19_name",
                "comics_items_20_name",
            ];
            eachCtx.mergeFieldsValuesIntoFieldArray_withValuesInFieldsNamed__Comics_length = eachCtx.mergeFieldsValuesIntoFieldArray_withValuesInFieldsNamed__Comics.length;
            //
            //
            eachCtx.mergeFieldsValuesIntoFieldArray_generateFieldNamed__Series = "Series";
            eachCtx.mergeFieldsValuesIntoFieldArray_withValuesInFieldsNamed__Series = 
            [
                "series_items_0_name",
                "series_items_1_name",
                "series_items_2_name",
                "series_items_3_name",
                "series_items_4_name",
                "series_items_5_name",
                "series_items_6_name",
                "series_items_7_name",
                "series_items_8_name",
                "series_items_9_name",
                "series_items_10_name",
                "series_items_11_name",
                "series_items_12_name",
                "series_items_13_name",
                "series_items_14_name",
                "series_items_15_name",
                "series_items_16_name",
                "series_items_17_name",
                "series_items_18_name",
                "series_items_19_name",
                "series_items_20_name",
            ];
            eachCtx.mergeFieldsValuesIntoFieldArray_withValuesInFieldsNamed__Series_length = eachCtx.mergeFieldsValuesIntoFieldArray_withValuesInFieldsNamed__Series.length;
            //
            //
            eachCtx.mergeFieldsValuesIntoFieldArray_generateFieldNamed__Events = "Events";
            eachCtx.mergeFieldsValuesIntoFieldArray_withValuesInFieldsNamed__Events = 
            [
                "events_items_0_name",
                "events_items_1_name",
                "events_items_2_name",
                "events_items_3_name",
                "events_items_4_name",
                "events_items_5_name",
                "events_items_6_name",
                "events_items_7_name",
                "events_items_8_name",
                "events_items_9_name",
                "events_items_10_name",
                "events_items_11_name",
                "events_items_12_name",
                "events_items_13_name",
                "events_items_14_name",
                "events_items_15_name",
                "events_items_16_name",
                "events_items_17_name",
                "events_items_18_name",
                "events_items_19_name",
                "events_items_20_name",
            ];
            eachCtx.mergeFieldsValuesIntoFieldArray_withValuesInFieldsNamed__Events_length = eachCtx.mergeFieldsValuesIntoFieldArray_withValuesInFieldsNamed__Events.length;
            //
            //
            // generate a bulk operation for our merge field values operations that we're going to do
            var mergeFieldsValuesIntoFieldArray_bulkOperation = forThisDataSource_nativeCollection.initializeUnorderedBulkOp();
            // store it into the "each-row" context for access during the each row operations
            eachCtx.mergeFieldsValuesIntoFieldArray_bulkOperation = mergeFieldsValuesIntoFieldArray_bulkOperation; 
            //
            //
            cb(null);
        },
        //
        afterGeneratingProcessedRowObjects_eachRowFns:
        [
            function(appCtx, eachCtx, rowDoc, cb)
            {
                // Use this space to perform derivations and add update operations to batch operation in eachCtx
                //
                mergeManyFieldsIntoOne(eachCtx.mergeFieldsValuesIntoFieldArray_generateFieldNamed__Comics, eachCtx.mergeFieldsValuesIntoFieldArray_withValuesInFieldsNamed__Comics, eachCtx.mergeFieldsValuesIntoFieldArray_withValuesInFieldsNamed__Comics_length);
                mergeManyFieldsIntoOne(eachCtx.mergeFieldsValuesIntoFieldArray_generateFieldNamed__Series, eachCtx.mergeFieldsValuesIntoFieldArray_withValuesInFieldsNamed__Series, eachCtx.mergeFieldsValuesIntoFieldArray_withValuesInFieldsNamed__Series_length);
                mergeManyFieldsIntoOne(eachCtx.mergeFieldsValuesIntoFieldArray_generateFieldNamed__Events, eachCtx.mergeFieldsValuesIntoFieldArray_withValuesInFieldsNamed__Events, eachCtx.mergeFieldsValuesIntoFieldArray_withValuesInFieldsNamed__Events_length);
                //
                function mergeManyFieldsIntoOne(generateFieldNamed, withValuesInFieldsNamed, withValuesInFieldsNamed_length) {
                    var generatedArray = [];
                    //
                    for (var i = 0 ; i < withValuesInFieldsNamed_length; i++) {
                        var fieldName = withValuesInFieldsNamed[i];
                        var fieldValue = rowDoc["rowParams"][fieldName];
                        if (typeof fieldValue !== 'undefined' && fieldValue !== null && fieldValue !== "") {
                            generatedArray.push(fieldValue);
                        }
                    }
                    //
                    //
                    var persistableValue = generatedArray;                

                    var updateFragment = { $addToSet: {} };
                    updateFragment["$addToSet"]["rowParams." + generateFieldNamed] = { "$each": persistableValue };

                    var bulkOperationQueryFragment = 
                    {
                        pKey: rowDoc.pKey, // the specific row
                        srcDocPKey: rowDoc.srcDocPKey // of its specific source (parent) document
                    };
                    eachCtx.mergeFieldsValuesIntoFieldArray_bulkOperation.find(bulkOperationQueryFragment).upsert().update(updateFragment);
                }
                //
                // finally, must call cb to advance
                //
                cb(null);
            }
        ],
        //
        afterGeneratingProcessedRowObjects_afterIterating_eachRowFn: function(appCtx, eachCtx, cb)
        {
            // Finished iterating … execute the batch operation
            // cb(null);

            // Finished iterating … execute the batch operation
            var writeConcern =
            {
                upsert: true // might as well - but this is not necessary
            };
            eachCtx.mergeFieldsValuesIntoFieldArray_bulkOperation.execute(writeConcern, function(err, result)
            // changed from: bulkOperation.execute(writeConcern, function(err, result)
            {
                if (err) {
                    winston.error("❌ [" + (new Date()).toString() + "] Error while saving raw row objects: ", err);
                } else {
                    winston.info("✅  [" + (new Date()).toString() + "] Saved raw row objects.");
                }
                cb(err); // all done - must call DB
            });
        }
    }
]
