//
// NOTE: Run this from arrays-server-js via bin/_*_MVP_CSV_DB_seed
//
// 
//
//
const import_datatypes = require('./import_datatypes')
// Set up application runtime object graph
var context = require('./import_context').NewHydratedContext() 
module.exports = context // access app at context.app
//
var dataSourceDescriptions = 
[
    {
        filename: "NewOrleans_High_Wage_Jobs__2009_-_Present_.csv",
        uid: "NewOrleans_High_Wage_Jobs__2009_-_Present_.csv",
        import_revision: 1,
        format: import_datatypes.DataSourceFormats.CSV,
        title: "New Orleans High Wage Jobs, 2009 - Present",
        fn_new_rowPrimaryKeyFromRowObject: function(rowObject, rowIndex) {
            return "" + rowIndex + "-" + rowObject["RowID"]
        }
        // ,
        // raw_rowObjects_scheme: {
        //     RowID: ArraysDataTypes.String,
        //     Date: ArraysData.Types.????,
        //     Year: ArraysData.Types.Year,
        //     Location: ArraysData.Types.GeoPoint_precursor_string,
        //     IndicatorName,
        //     IndicatorValue,
        //     IndicatorTable
        // },
        // add_fields: {
        //
        // }
    }    
]
context.import_controller.Import_dataSourceDescriptions(dataSourceDescriptions)