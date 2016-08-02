var winston = require('winston');

var import_datatypes = require('../import_datatypes');
var import_processing = require('../import_processing');

exports.Descriptions =
    [
        {
            schemaname: "transcript_schema.js",
            filename: "Municipal_News_Data_v5_s.csv",
            fileEncoding: "utf8", // default
            dataset_uid: "municipal",
            format: import_datatypes.DataSource_formats.CSV,
            urls: [ "http://cdm16118.contentdm.oclc.org/cdm/landingpage/collection/p16118coll7" ],
            description: "The Municipal League of Seattle was organized on May 23, 1910 with a mission of informing and involving its members and the public in civic issues.",
            // Special coercion scheme
            raw_rowObjects_mismatchScheme:
            {
                // Substitute
                'Id': {
                    do: import_datatypes.Mismatich_ops.ToField,
                    opts: {
                        field: "Identifier"
                    }
                },
                // Drop
                'No': {
                    do: import_datatypes.Mismatich_ops.ToDrop
                }
            }
        }
    ]