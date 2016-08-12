//
var winston = require('winston');
//
var import_datatypes = require('../import_datatypes');
var import_processing = require('../import_processing');
//
//
exports.Descriptions =
    [
        {
            schemaname: "transcript_schema.js",
            filename: "Jewish_Transcript_Data_v3.csv",
            dataset_uid: "jewish",
            fileEncoding: "utf8", // default
            format: import_datatypes.DataSource_formats.CSV,
            fe_nestedObjectValueOverrides: {
                'Title': {
                    'p': 'Page '
                }
            }
        }
    ];
