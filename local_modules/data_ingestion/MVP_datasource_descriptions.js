//
const import_datatypes = require('./import_datatypes');
const import_processing = require('./import_processing');
//
//
exports.Descriptions = 
[
    //
    // Production - MoMA dataset
    {
        filename: "MoMA_Artists_v1_jy.csv",
        uid: "MoMA_Artists_v1_jy.csv",
        importRevision: 1,
        format: import_datatypes.DataSource_formats.CSV,
        title: "MoMA - Artists",
        //
        //
        fn_new_rowPrimaryKeyFromRowObject: function(rowObject, rowIndex)
        {
            return "" + rowIndex + "-" + rowObject["ConstituentID"]
        },
        raw_rowObjects_coercionScheme:
        {
            BeginDate: {
                do: import_datatypes.DataSource_fieldValueDataTypeCoercion_operationsByName.ToDate,
                opts: import_datatypes.DataSource_fieldValueDataTypeCoercion_optionsPacksByNameByOperationName.ToDate.FourDigitYearOnly
            },
            EndDate: {
                do: import_datatypes.DataSource_fieldValueDataTypeCoercion_operationsByName.ToDate,
                opts: import_datatypes.DataSource_fieldValueDataTypeCoercion_optionsPacksByNameByOperationName.ToDate.FourDigitYearOnly
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
                    ofOtherRawSrcUID: "MoMA_Artworks CSV",
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
        //
        fe_excludeFields: []
    }
    , {
        filename: "MoMA_Artworks_v2_jy.csv",
        uid: "MoMA_Artworks CSV",
        importRevision: 2,
        format: import_datatypes.DataSource_formats.CSV,
        title: "MoMA - Artworks",
        //
        //
        fn_new_rowPrimaryKeyFromRowObject: function(rowObject, rowIndex)
        {
            return "" + rowIndex + "-" + rowObject["ObjectID"]
        },
        raw_rowObjects_coercionScheme:
        {
            DateAcquired: {
                do: import_datatypes.DataSource_fieldValueDataTypeCoercion_operationsByName.ToDate,
                opts: {
                    format: "MM/DD/YYYY" // e.g. "1/01/2009"
                }
            },
            Date: {
                do: import_datatypes.DataSource_fieldValueDataTypeCoercion_operationsByName.ToDate,
                opts: import_datatypes.DataSource_fieldValueDataTypeCoercion_optionsPacksByNameByOperationName.ToDate.FourDigitYearOnly
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
            "imgURL_original", 
            "imgURL_gridThumb"
        ],
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
                    ofOtherRawSrcUID: "MoMA_Artists_v1_jy.csv",
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
