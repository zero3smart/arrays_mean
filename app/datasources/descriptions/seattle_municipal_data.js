var winston = require('winston');

var import_datatypes = require('../utils/import_datatypes');

exports.Descriptions =
    [
        {
            schema_id: "transcript_schema.js",
            sourceURL: "Municipal_News_Data_v5.csv",
            fileEncoding: "utf8", // default
            dataset_uid: "municipal",
            format: import_datatypes.DataSource_formats.CSV,
            // Special coercion scheme
            raw_rowObjects_mismatchScheme: {
                // Substitute
                /* 'Id': {
                 do: import_datatypes.Mismatich_ops.ToField,
                 opts: {
                 field: "Identifier"
                 }
                 },
                 // Drop
                 'No': {
                 do: import_datatypes.Mismatich_ops.ToDrop
                 } */
            },
            fe_nestedObject_fields: [
                'Catalog Title',
                'Date',
                'Decade',
                'Volume',
                'Issue',
                'Volume/Issue',
                'Type',
                'Local Type',
                'Transcript',
                'Date created',
                'Date modified',
                'Reference URL',
                'CONTENTdm number',
                'CONTENTdm file name',
                'CONTENTdm file path',
                'FullSize',
                'Thumbnail'
            ],
            fe_nestedObject_fieldOverrides: {
                'Catalog Title': 'Title'
            },
            fe_nestedObject_criteria: function (rowDoc) {
                return !rowDoc.rowParams.Title || rowDoc.rowParams.Title == '';
            },
        }
    ];
