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
            filename: "Jewish_Transcript_Data.tsv",
            fileEncoding: "utf8", // default
            uid: "jewish_transcript_data",
            importRevision: 1,
            format: import_datatypes.DataSource_formats.TSV,
            title: "The Jewish Transcript",
            brandColor: "#6699CC",
            urls: [ "http://cdm16118.contentdm.oclc.org/cdm/landingpage/collection/p16118coll10" ],
            description: "Founded by Herman Horowitz in 1924, The Jewish Transcript documents the daily life of the Jewish community in Seattle as well as local and international events from the 1920's to present day.",
            raw_rowObjects_coercionScheme:
            {
                'Date': {
                    do: import_datatypes.Coercion_ops.ToDate,
                    opts: {
                        format: "YYYY-MM-DD" // e.g. "2009-03-21"
                    }
                },
                'Date created': {
                    do: import_datatypes.Coercion_ops.ToDate,
                    opts: {
                        format: "YYYY-MM-DD" // e.g. "2009-03-21"
                    }
                },
                'Date modified': {
                    do: import_datatypes.Coercion_ops.ToDate,
                    opts: {
                        format: "YYYY-MM-DD" // e.g. "2009-03-21"
                    }
                },

                'Decade': {
                    do: import_datatypes.Coercion_ops.ToStringTrim
                },
                'Catalog Title': {
                    do: import_datatypes.Coercion_ops.ToStringTrim
                },
                'LCCN': {
                    do: import_datatypes.Coercion_ops.ToStringTrim
                },

                /*'Pages': {
                 do: import_datatypes.Coercion_ops.ToInteger
                 },
                 'Issue': {
                 do: import_datatypes.Coercion_ops.ToInteger
                 },
                 'Volume': {
                 do: import_datatypes.Coercion_ops.ToInteger
                 }*/
            },
            fe_listed: true,
            fe_displayTitleOverrides: {}, // this is needed to not through an error
            //
            fn_new_rowPrimaryKeyFromRowObject: function(rowObject, rowIndex)
            {
                return "" + rowIndex + "-" + rowObject["Identifier"]
            },
            fe_designatedFields:
            {
                objectTitle: "Title",
                originalImageURL: "CONTENTdm file path",
                //medThumbImageURL: "thumb_small"  Not Available?
            },
            fe_views: {
                gallery: true,
                choropleth: false,
                chart: true,
                scatterplot: true,
                timeline: true
            },
            fe_excludeFields:
                [
                    "Identifier",
                    "Neighborhood",
                    "Volume/Issue",
                    "Edition Label",
                    "Notes",
                    "Digitization Specifications",
                    "File Format",
                    "Type",
                    "Local Type",
                    "Copyright Status",
                    "Reference URL",
                    "CONTENTdm number",
                    "CONTENTdm file name",
                    "CONTENTdm file path",
                    "Pages_Title",
                    "Pages_Date",
                    "Pages_Decade",
                    "Pages_Volume",
                    "Pages_Issue",
                    "Pages_Volume/Issue",
                    "Pages_Type",
                    "Pages_Local Type",
                    "Pages_Date created",
                    "Pages_Date modified",
                    "Pages_Reference URL",
                    "Pages_CONTENTdm number",
                    "Pages_CONTENTdm file name",
                    "Pages_CONTENTdm file path",
                    "Transcript",
                    "Directory Name",
                    "Digital Tech",
                    "Language"
                ],
            fe_displayTitleOverrides:
            {
                // these are to be tuples - the values must be unique as well
                "Pages_Transcript" : "Transcript"
            },
            fe_filters_fabricatedFilters:
                [
                    {
                        title: "Image",
                        choices: [
                            {
                                title: "Has image",
                                $match: {
                                    "rowParams.CONTENTdm file path": {
                                        $exists: true,
                                        $nin: [ "", null ]
                                    }
                                }
                            }
                        ]
                    },
                    {
                        title: "Description",
                        choices: [
                            {
                                title: "Has description",
                                $match: {
                                    "rowParams.description": {
                                        $exists: true,
                                        $nin: [ "", null ]
                                    }
                                }
                            }
                        ]
                    }
                ],
            fe_filters_valuesToExcludeByOriginalKey:
            {
                _all: [ "", null ]
            },
            //
            //
            fe_filters_default:
            {
                "Image": [ "Has image" ]
            },
            fe_filters_fieldsNotAvailable:
                [
                    "Title",
                    "Identifier",
                    "Description",
                    "Subjects",
                    "Creator",
                    "Neighborhood",
                    "Date Labeled",
                    "Publisher",
                    "Publisher Location (NDNP)",
                    "Edition Label",
                    "Notes",
                    "Directory Name",
                    "Title [NDNP]",
                    "Language",
                    "Source",
                    "Digital Tech",
                    "Rights and Reproduction",
                    "Collection",
                    "Contributing Institution",
                    "Pages_Transcript",
                    "File Name",
                    "Transcript"
                ],
            //
            //
            fe_chart_defaultGroupByColumnName_humanReadable: "Decade",
            fe_chart_fieldsNotAvailableAsGroupByColumns:
                [
                    "Title",
                    "Identifier",
                    "Subjects",
                    "Creator",
                    "Date Labeled",
                    "Publisher",
                    "Publisher Location (NDNP)",
                    "Collection",
                    "Contributing Institution",
                    "Rights and Reproduction",
                    "Source",
                    "Digital Tech",
                    "Language",
                    "Transcript",
                    "Title [NDNP]",
                    "OCLC number",
                    "Pages_Transcript",
                    "Directory Name",
                    "File Name"
                ],
            fe_chart_valuesToExcludeByOriginalKey:
            {
                _all: [ "", null, "NULL", "(not specified)", "NA" ],
            },
            //
            //
            fe_timeline_defaultGroupByColumnName_humanReadable: "Year",
            fe_timeline_durationsAvailableForGroupBy:
                [
                    "Decade",
                    "Year",
                    "Month",
                    "Day"
                ],
            fe_timeline_defaultSortByColumnName_humanReadable: "Date",
            fe_timeline_fieldsNotAvailableAsSortByColumns:
                [
                    "Title",
                    "Catalog Title",
                    "Description",
                    "Subjects",
                    "Creator",
                    "Date Labeled",
                    "Decade",
                    "Publisher",
                    "Publisher Location (NDNP)",
                    "Volume",
                    "Issue",
                    "Physical Measurements",
                    "Collection",
                    "Contributing Institution",
                    "Rights and Reproduction",
                    "Source",
                    "Digital Tech",
                    "Language",
                    "Transcript",
                    "Title [NDNP]",
                    "LCCN",
                    "Pages",
                    "OCLC number",
                    "Directory Name",
                    "File Name",
                    "Pages_Transcript"
                ],
            //
            //
            afterGeneratingProcessedRowObjects_setupBefore_eachRowFn: function(appCtx, eachCtx, cb)
            {
                // Setup each ctx, such as the batch operation
                var srcDoc_pKey = appCtx.raw_source_documents_controller.NewCustomPrimaryKeyStringWithComponents(this.uid, this.importRevision);
                var forThisDataSource_mongooseContext = appCtx.processed_row_objects_controller.Lazy_Shared_ProcessedRowObject_MongooseContext(srcDoc_pKey);
                // ^ there is only one mongooseContext in raw_source_documents_controller because there is only one src docs collection,
                // but there are many mongooseContexts derivable/in raw_row_objects_controller because there is one collection of processed row objects per src doc
                var forThisDataSource_rowObjects_modelName = forThisDataSource_mongooseContext.Model.modelName;
                var forThisDataSource_RawRowObject_model = forThisDataSource_mongooseContext.Model.model;
                var forThisDataSource_nativeCollection = forThisDataSource_mongooseContext.Model.collection;


                // specify (and cache/store) an operating spec for the row merge operation
                eachCtx.pageFields = [
                    'Title',
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
                    'CONTENTdm file path'
                ];
                eachCtx.prefixForPageFields = 'Pages_';
                //
                //
                // generate a bulk operation for our merge field values operations that we're going to do
                var mergeRowsIntoFieldArray_bulkOperation = forThisDataSource_nativeCollection.initializeUnorderedBulkOp();
                // store it into the "each-row" context for access during the each row operations
                eachCtx.mergeRowsIntoFieldArray_bulkOperation = mergeRowsIntoFieldArray_bulkOperation;
                eachCtx.numberOfRows = 0;
                eachCtx.cachedPages = [];
                //
                //
                cb(null);
            },
            //
            afterGeneratingProcessedRowObjects_eachRowFns:
                [
                    function(appCtx, eachCtx, rowDoc, cb)
                    {
                        // Use this space to perform derivations and add update operations to batch operation in eachCtx
                        //
                        // Detect if the row is an issue or page by primary key - Identifier
                        if (rowDoc.rowParams.Identifier && rowDoc.rowParams.Identifier != '') {
                            // Issue
                            // Apply to Merge the cached rows(Page) into one row(Issue)
                            var updateFragment = {$pushAll: {}};
                            var bulkOperationQueryFragment;

                            for (var i = 0; i < eachCtx.pageFields.length; i ++) {
                                var fieldName = eachCtx.prefixForPageFields + eachCtx.pageFields[i];

                                var generatedArray = [];
                                //
                                eachCtx.cachedPages.forEach(function(rowDoc) {
                                    var fieldValue = rowDoc["rowParams"][eachCtx.pageFields[i]];
                                    generatedArray.push(fieldValue);

                                    bulkOperationQueryFragment =
                                    {
                                        pKey: rowDoc.pKey, // the specific row
                                        srcDocPKey: rowDoc.srcDocPKey // of its specific source (parent) document
                                    };
                                    eachCtx.mergeRowsIntoFieldArray_bulkOperation.find(bulkOperationQueryFragment).remove();
                                });

                                updateFragment["$pushAll"]["rowParams." + fieldName] = generatedArray;
                            }

                            bulkOperationQueryFragment =
                            {
                                pKey: rowDoc.pKey, // the specific row
                                srcDocPKey: rowDoc.srcDocPKey // of its specific source (parent) document
                            };
                            eachCtx.mergeRowsIntoFieldArray_bulkOperation.find(bulkOperationQueryFragment).upsert().update(updateFragment);

                            // Clear cache
                            eachCtx.cachedPages = [];

                            eachCtx.numberOfRows ++;

                        } else {
                            // Cache pages if it's a page
                            eachCtx.cachedPages.push(rowDoc);
                        }
                        //
                        // finally, must call cb to advance
                        //
                        cb(null);
                    }
                ],
            //
            afterGeneratingProcessedRowObjects_afterIterating_eachRowFn: function(appCtx, eachCtx, cb)
            {
                // Finished iterating … execute the batch operation
                // cb(null);

                // Wrong format since the last row should not be page.
                // if (eachCtx.cachedPages.length > 0) return cb(null);
                var self = this;

                // Finished iterating … execute the batch operation
                var writeConcern =
                {
                    upsert: true // might as well - but this is not necessary
                };
                eachCtx.mergeRowsIntoFieldArray_bulkOperation.execute(writeConcern, function(err, result)
                {
                    if (err) {
                        winston.error("❌ [" + (new Date()).toString() + "] Error while saving raw row objects: ", err);
                    } else {
                        winston.info("✅  [" + (new Date()).toString() + "] Saved raw row objects.");
                    }
                    // Update numberOfRows on the row source documents
                    var srcDoc_pKey = appCtx.raw_source_documents_controller.NewCustomPrimaryKeyStringWithComponents(self.uid, self.importRevision);
                    var updatedDocument = {primaryKey: srcDoc_pKey, numberOfRows: eachCtx.numberOfRows};
                    appCtx.raw_source_documents_controller.UpsertWithOnePersistableObjectTemplate(updatedDocument, cb);
                });
            }
        }
    ]