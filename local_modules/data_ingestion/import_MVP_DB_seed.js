//
// NOTE: Run this from arrays-server-js via bin/_*_MVP_DB_seed
//
// 
//
//
const import_datatypes = require('./import_datatypes')

//
var dataSourceDescriptions = 
[
    {
        filename: "MoMA_Artists_v1_jy.csv",
        uid: "MoMA_Artists_v1_jy.csv",
        import_revision: 1,
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
                opts: import_datatypes.DataSource_fieldValueDataTypeCoercion_optionsPacksByNameByOperationName.ToDate.YearOnly
            },
            EndDate: {
                do: import_datatypes.DataSource_fieldValueDataTypeCoercion_operationsByName.ToDate,
                opts: import_datatypes.DataSource_fieldValueDataTypeCoercion_optionsPacksByNameByOperationName.ToDate.YearOnly
            }
        },
        raw_rowObjects_postCoercion_pipeline: 
        [
            function(rowObject, rowIndex) 
            { // An example of a key rewrite
                rowObject["Gender"] = rowObject["Code"]
                delete rowObject["Code"]
            }
        ]
    },
    {
        filename: "MoMA_Artworks_v1_jy.csv",
        uid: "MoMA_Artworks_v1_jy.csv",
        import_revision: 1,
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
                    format: "MM/DD/YY", // e.g. "1/01/2009"
                    replacement_parseTwoDigitYear_fn: function (input) 
                    {
                        var now_year = new Date().getFullYear()
                        var asInt = parseInt(input)
                        var wouldDateBeInFuture = asInt + 2000 > now_year
                        var outYear = asInt + (wouldDateBeInFuture ? 1900 : 2000) // if it would be in the future, put it in the past, else, assume it's post 00

                        return outYear
                    }
                }
            },
            Date: {
                do: import_datatypes.DataSource_fieldValueDataTypeCoercion_operationsByName.ToDate,
                opts: import_datatypes.DataSource_fieldValueDataTypeCoercion_optionsPacksByNameByOperationName.ToDate.YearOnly
            }
        }
    }
    
    
    
    // {
    //     filename: "NewOrleans_High_Wage_Jobs__2009_-_Present_.csv",
    //     uid: "NewOrleans_High_Wage_Jobs__2009_-_Present_.csv",
    //     import_revision: 1,
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
    //             opts: import_datatypes.DataSource_fieldValueDataTypeCoercion_optionsPacksByNameByOperationName.ToDate.YearOnly
    //         },
    //         IndicatorValue: {
    //             do: import_datatypes.DataSource_fieldValueDataTypeCoercion_operationsByName.ToInteger
    //         }
    //     }
    // }
]
// Set up application runtime object graph
var context = require('./import_context').NewHydratedContext() 
// Now import
context.import_controller.Import_dataSourceDescriptions(dataSourceDescriptions)
