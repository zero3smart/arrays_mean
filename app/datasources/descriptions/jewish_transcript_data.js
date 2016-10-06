//
var winston = require('winston');
//
var import_datatypes = require('../utils/import_datatypes');
//
//
exports.Descriptions =
    [
        {
            schema_id: "transcript_schema.js",
            filename: "Jewish_Transcript_Data_v3.csv",
            dataset_uid: "jewish",
            fileEncoding: "utf8", // default
            format: import_datatypes.DataSource_formats.CSV,
            fe_nestedObject_valueOverrides: {
                'Title': {
                    'p': 'Page '
                }
            }
        }
    ];
