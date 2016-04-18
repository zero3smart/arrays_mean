//
var import_datatypes = require('./import_datatypes');
var import_processing = require('./import_processing');
//
//
exports.Descriptions = 
[
    //
    // Production - MoMA dataset
    {
        filename: "MoMA_Artists_v1_jy.csv",
        uid: "moma_artists",
        importRevision: 1,
        format: import_datatypes.DataSource_formats.CSV,
        title: "MoMA - Artists",
        urls: [ "http://zenodo.org/record/46902" ],
        description: "Basic catalog information for artists with works in the collection of The Museum of Modern Art (MoMA), including artist name, nationality, gender, birth year, death year, Wiki QID and Getty ULAN ID. ",
        //
        //
        fn_new_rowPrimaryKeyFromRowObject: function(rowObject, rowIndex)
        {
            return "" + rowIndex + "-" + rowObject["ConstituentID"]
        },
        raw_rowObjects_coercionScheme:
        {
            BeginDate: {
                do: import_datatypes.Coercion_ops.ToDate,
                opts: import_datatypes.Coercion_optionsPacks.ToDate.FourDigitYearOnly
            },
            EndDate: {
                do: import_datatypes.Coercion_ops.ToDate,
                opts: import_datatypes.Coercion_optionsPacks.ToDate.FourDigitYearOnly
            }
        },
        //
        //
        afterImportingAllSources_generate:
        [
            {
                field: "Artworks",
                singular: false, // many artworks per artist
                by: {
                    doing: import_processing.Ops.Join,
                    onField: "Artist",
                    ofOtherRawSrcUID: "moma_artworks_csv",
                    andOtherRawSrcImportRevision: 2,
                    withLocalField: "Artist",
                    obtainingValueFromField: "Title"
                }
            }
        ],
        //
        //
        fe_designatedFields: 
        {
            objectTitle: "Artist",
            originalImageURL: null, // not strictly necessary to define as null but done for explicitness
            gridThumbImageURL: null // not strictly necessary to define as null but done for explicitness
        },
        fe_excludeFields: 
        [
            "ConstituentID" // not sure if we really want to exclude this
        ],
        fe_fieldsNotAvailableAsFilters:
        [
            "DisplayDate",
            "BeginDate",
            "EndDate",
            "Wiki QID",
            "ULAN"
        ]
    }
    , {
        filename: "MoMA_Artworks_v2_jy.csv",
        uid: "moma_artworks",
        importRevision: 2,
        format: import_datatypes.DataSource_formats.CSV,
        title: "MoMA - Artworks",
        urls: [ "https://github.com/MuseumofModernArt/collection" ],
        description: "This research dataset contains 126,713 records, representing all of the works that have been accessioned into MoMA’s collection and cataloged in our database.",
        //
        //
        fn_new_rowPrimaryKeyFromRowObject: function(rowObject, rowIndex)
        {
            return "" + rowIndex + "-" + rowObject["ObjectID"]
        },
        raw_rowObjects_coercionScheme:
        {
            DateAcquired: {
                do: import_datatypes.Coercion_ops.ToDate,
                opts: {
                    format: "MM/DD/YYYY" // e.g. "1/01/2009"
                }
            },
            Date: {
                do: import_datatypes.Coercion_ops.ToDate,
                opts: import_datatypes.Coercion_optionsPacks.ToDate.FourDigitYearOnly
            }
        },
        //
        //
        fe_designatedFields: 
        {
            objectTitle: "Title",
            originalImageURL: "imgURL_original",
            gridThumbImageURL: "imgURL_gridThumb"
        },
        fe_excludeFields: 
        [
            "ObjectID", // not sure if we really want to exclude this
            //
            "imgURL_original", 
            "imgURL_gridThumb"
        ],
        fe_fieldsNotAvailableAsFilters:
        [
            "ArtistBio",
            "Dimensions",
            "CreditLine",
            "MoMANumber",
            "DateAcquired",
            "URL",
            "Date"
        ],
        fe_filters_oneToOneOverrideWithValuesByTitleByFieldName: 
        {
            "Artist Gender": {
                "Male": "Male",
                "Female": "Female",
                "Not Specified": "NULL"
            }
        },
        //
        //
        afterImportingAllSources_generate: 
        [
            {
                field: "Artist Gender",
                singular: true, // there is only one gender per artwork's artist
                by: {
                    doing: import_processing.Ops.Join,
                    onField: "Artist",
                    ofOtherRawSrcUID: "moma_artists_csv",
                    andOtherRawSrcImportRevision: 1,
                    withLocalField: "Artist",
                    obtainingValueFromField: "Code"
                }
            }
        ],
        //
        //
        afterImportingAllSources_generateByScraping:
        [
            {
                htmlSourceAtURLInField: "URL",
                imageSrcSetInSelector: "img.sov-hero__image-container__image@srcset",
                prependToImageURLs: "http://www.moma.org", // since the urls are like "/media/…", not "http://…/media/…"
                useAndHostSrcSetSizeByField: {
                    "imgURL_original": {
                        size: "2000w"
                    },
                    "imgURL_gridThumb": {
                        size: "640w"
                    }
                }
            }
        ]
        // //
        // //
        // // This is implemented but currently not used (it was built for scraping)
        // afterGeneratingProcessedRowObjects_setupBefore_eachRowFn: function(appCtx, eachCtx, cb)
        // {
        //     // Setup each ctx, such as the batch operation
        //     cb(null);
        // },
        // //
        // afterGeneratingProcessedRowObjects_eachRowFns:
        // [
        //     function(appCtx, eachCtx, rowDoc, cb)
        //     {
        //         // console.log("A row", rowDoc)
        //         // perform derivations and add update operations to batch operation in eachCtx
        //         cb(null);
        //     }
        // ],
        // //
        // afterGeneratingProcessedRowObjects_afterIterating_eachRowFn: function(appCtx, eachCtx, cb)
        // {
        //     // Finished iterating … execute the batch operation
        //     cb(null);
        // }
        // //
        // //
    }
]
