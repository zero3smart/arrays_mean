//
// NOTE: Run this from arrays-server-js via bin/_*_MVP_DB_seed
//
// 
//
//
const import_datatypes = require('./import_datatypes');
const import_processing = require('./import_processing');
//
//
var dataSourceDescriptions = 
[
    //
    // Production - MoMA dataset
    {
        filename: "MoMA_Artists_v1_jy.csv",
        uid: "MoMA_Artists_v1_jy.csv",
        importRevision: 1,
        format: import_datatypes.DataSource_formats.CSV,
        title: "MoMA - Artists",
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
        ]
    }
    , {
        filename: "MoMA_Artworks_v2_jy.csv",
        uid: "MoMA_Artworks CSV",
        importRevision: 2,
        format: import_datatypes.DataSource_formats.CSV,
        title: "MoMA - Artworks",
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
        afterImportingAllSources_generate: 
        [
            {
                field: "Artist Gender",
                singular: true, // there is only one gender per artwork's artist
                by: {
                    doing: import_processing.Ops.Join,
                    onField: "Artist",
                    ofOtherRawSrcUID: "MoMA_Artists_v1_jy.csv",
                    andOtherRawSrcImportRevision: 2,
                    withLocalField: "Artist",
                    obtainingValueFromField: "Code"
                }
            }
        ]
    }

    //
    // Small dataset for development/testing
    // Generally, do not commit these uncommented
    //
    // {
    //     filename: "MoMA_Artists_tinySlice.csv",
    //     uid: "MoMA_Artists_tinySlice.csv",
    //     importRevision: 4,
    //     format: import_datatypes.DataSource_formats.CSV,
    //     title: "MoMA - Artists - DEVELOPMENT - tinyslice",
    //     fn_new_rowPrimaryKeyFromRowObject: function(rowObject, rowIndex)
    //     {
    //         return "" + rowIndex + "-" + rowObject["ConstituentID"]
    //     },
    //     raw_rowObjects_coercionScheme:
    //     {
    //         BeginDate: {
    //             do: import_datatypes.DataSource_fieldValueDataTypeCoercion_operationsByName.ToDate,
    //             opts: import_datatypes.DataSource_fieldValueDataTypeCoercion_optionsPacksByNameByOperationName.ToDate.FourDigitYearOnly
    //         },
    //         EndDate: {
    //             do: import_datatypes.DataSource_fieldValueDataTypeCoercion_operationsByName.ToDate,
    //             opts: import_datatypes.DataSource_fieldValueDataTypeCoercion_optionsPacksByNameByOperationName.ToDate.FourDigitYearOnly
    //         }
    //     },
    //     raw_rowObjects_postCoercion_pipeline:
    //     [
    //         function(rowObject, rowIndex)
    //         { // An example of a key rewrite
    //             rowObject["Gender"] = rowObject["Code"]
    //             delete rowObject["Code"]
    //         }
    //     ]
    // }
    //
    // {
    //     filename: "NewOrleans_High_Wage_Jobs__2009_-_Present_.csv",
    //     uid: "NewOrleans_High_Wage_Jobs__2009_-_Present_.csv",
    //     importRevision: 1,
    //     format: import_datatypes.DataSource_formats.CSV,
    //     title: "New Orleans High Wage Jobs, 2009 - Present",
    //     fn_new_rowPrimaryKeyFromRowObject: function(rowObject, rowIndex)
    //     {
    //         return "" + rowIndex + "-" + rowObject["RowID"]
    //     },
    //     raw_rowObjects_coercionScheme:
    //     {
    //         RowID: { // Not necessary to define "ProxyExisting" operations but to show a "no-op" example…
    //             do: import_datatypes.DataSource_fieldValueDataTypeCoercion_operationsByName.ProxyExisting
    //         },
    //         Date: {
    //             do: import_datatypes.DataSource_fieldValueDataTypeCoercion_operationsByName.ToDate,
    //             opts: {
    //                 format: "MM/DD/YYYY HH:mm:ss A" // e.g. "01/01/2009 12:00:00 AM"
    //             }
    //         },
    //         Year: {
    //             do: import_datatypes.DataSource_fieldValueDataTypeCoercion_operationsByName.ToDate,
    //             opts: import_datatypes.DataSource_fieldValueDataTypeCoercion_optionsPacksByNameByOperationName.ToDate.FourDigitYearOnly
    //         },
    //         IndicatorValue: {
    //             do: import_datatypes.DataSource_fieldValueDataTypeCoercion_operationsByName.ToInteger
    //         }
    //     }
    // }
]
// Set up application runtime object graph
var context = require('./import_context').NewHydratedContext();
// Now import
context.import_controller.Import_dataSourceDescriptions(dataSourceDescriptions);
