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
            filename: "Jewish_Transcript_Data_v3_s.csv",
            dataset_uid: "jewish",
            fileEncoding: "utf8", // default
            format: import_datatypes.DataSource_formats.CSV,
            urls: [ "http://cdm16118.contentdm.oclc.org/cdm/landingpage/collection/p16118coll10" ],
            description: "Founded by Herman Horowitz in 1924, The Jewish Transcript documents the daily life of the Jewish community in Seattle as well as local and international events from the 1920's to present day.",
            raw_rowObjects_mismatchingScheme:
            {
            }
        }
    ]