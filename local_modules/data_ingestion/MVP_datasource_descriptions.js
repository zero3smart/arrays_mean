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
        fileEncoding: "utf8", // the default
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
                    ofOtherRawSrcUID: "moma_artworks",
                    andOtherRawSrcImportRevision: 2,
                    withLocalField: "DisplayName",
                    obtainingValueFromField: "Title"
                }
            }
        ],
        //
        //
        fe_designatedFields: 
        {
            objectTitle: "DisplayName",
            originalImageURL: null, // not strictly necessary to define as null but done for explicitness
            medThumbImageURL: null // not strictly necessary to define as null but done for explicitness
        },
        fe_excludeFields: 
        [
            "ConstituentID" // not sure if we really want to exclude this
        ],
        fe_displayTitleOverrides:
        { // these are to be tuples - the values must be unique as well
            "Code" : "Gender",
            "DisplayDate" : "Bio",
            "BeginDate" : "Date of Birth",
            "EndDate" : "Date of Death"
        },
        //
        fe_filters_fieldsNotAvailable:
        [
            "DisplayName", // because they're effectively unique
            "Artworks", // it's an array
            "DisplayDate",
            "BeginDate",
            "EndDate",
            "Wiki QID",
            "ULAN"
        ],
        fe_filters_oneToOneOverrideWithValuesByTitleByFieldName: 
        {
            "Gender": {
                "Male": "Male",
                "Female": "Female",
                "Not Specified": "NULL"
            }
        },
        //
        fe_filters_valuesToExcludeByOriginalKey:
        {
            _all: [ "" ],
            "Nationality" : [ "NULL", "Nationality unknown", "nationality unknown", "Nationality Unknown" ]
        },
        //
        fe_chart_defaultGroupByColumnName_humanReadable: "Nationality",
        fe_chart_fieldsNotAvailableAsGroupByColumns:
        [
            "DisplayName", // because they're effectively unique
            "Artworks", // it's an array
            "DisplayDate",
            "Wiki QID",
            "ULAN"
        ],
        fe_chart_valuesToExcludeByOriginalKey:
        {
            _all: [ "", null, "NULL", "(not specified)" ],
            Nationality: [ "Nationality unknown", "nationality unknown", "Nationality Unknown" ]
        },
    }
    , {
        filename: "MoMA_Artworks_v2_jy.csv",
        fileEncoding: "utf8", // the default
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
                    format: "YYYY-MM-DD" // e.g. "2009-03-21"
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
            medThumbImageURL: "imgURL_gridThumb"
        },
        fe_excludeFields: 
        [
            "ObjectID", // not sure if we really want to exclude this
            //
            "imgURL_original", 
            "imgURL_gridThumb"
        ],
        fe_displayTitleOverrides:
        { // these are to be tuples - the values must be unique as well
            "CuratorApproved": "Curator Approved",
            "DateAcquired": "Date Acquired",
            "CreditLine": "Credit Line",
            "ArtistBio": "Artist Bio",
            "MoMANumber": "MoMA Number"
        },
        fe_outputInFormat:
        {
            DateAcquired: {
                format: "MMMM Do, YYYY"
            }
        },
        //
        fe_filters_fieldsNotAvailable:
        [
            "Title", // they're almost exclusively unique
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
        fe_filters_valuesToExcludeByOriginalKey:
        {
            _all: [ "" ]
        },
        fe_filters_fabricatedFilters:
        [
            {
                title: "Image",
                choices: [
                    {
                        title: "Has image",
                        $match: {
                            "rowParams.imgURL_gridThumb": {
                                $exists: true,
                                $nin: [ "", null ]
                            }
                        }
                    },
                    {
                        title: "Has no image",
                        $match: {
                            $or: [
                                { "rowParams.imgURL_gridThumb": { $exists: false } },
                                { "rowParams.imgURL_gridThumb": { $eq: "" } },
                                { "rowParams.imgURL_gridThumb": { $eq: null } },
                            ]
                        }
                    }
                ]
            },
            {
                title: "Object Title",
                choices: [
                    {
                        title: "Has title",
                        $match: {
                            "rowParams.Title": {
                                $exists: true,
                                $nin: [ "", null ]
                            }
                        }
                    },
                    {
                        title: "Has no title",
                        $match: {
                            $or: [
                                { "rowParams.Title": { $exists: false } },
                                { "rowParams.Title": { $eq: "" } },
                                { "rowParams.Title": { $eq: null } }
                            ]
                        }
                    }
                ]
            }
        ],
        //
        //
        fe_chart_defaultGroupByColumnName_humanReadable: "Artist Gender",
        fe_chart_fieldsNotAvailableAsGroupByColumns:
        [
            "Title", // they're almost exclusively unique
            "ArtistBio",
            "Dimensions",
            "CreditLine",
            "MoMANumber",
            "DateAcquired",
            "URL"
        ],
        fe_chart_valuesToExcludeByOriginalKey:
        {
            _all: [ "", null, "NULL", "(not specified)" ],
            Classification: [ "(not assigned)" ]
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
                    onField: "DisplayName",
                    ofOtherRawSrcUID: "moma_artists",
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
