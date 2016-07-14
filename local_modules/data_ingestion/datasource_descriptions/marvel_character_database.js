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
            filename: "Marvel_Character_Database.csv",
            fileEncoding: "utf8", // default
            uid: "marvel_character_database",
            importRevision: 1,
            format: import_datatypes.DataSource_formats.CSV,
            title: "Marvel Character Database",
            urls: [ "http://developer.marvel.com/docs" ],
            description: "Find profiles for your favorite Marvel characters in Marvel.com's character database, including info on first appearances, key issues, and basic statistics.",
            raw_rowObjects_coercionScheme:
            {
                modified: {
                    do: import_datatypes.Coercion_ops.ToDate,
                    opts: {
                        format: "YYYY-MM-DD" // e.g. "2009-03-21"
                    }
                }
            },
            fe_listed: true,
            fe_displayTitleOverrides: {}, // this is needed to not through an error
            //
            fn_new_rowPrimaryKeyFromRowObject: function(rowObject, rowIndex)
            {
                return "" + rowIndex + "-" + rowObject["id"]
            },
            fe_designatedFields: 
            {
                objectTitle: "name",
                originalImageURL: "thumb_large",
                medThumbImageURL: "thumb_small"
            },
            fe_views: {
                gallery: true,
                choropleth: false,
                chart: true,
                timeline: true
            },
            fe_excludeFields: 
            [
                "id",
                // "name",
                // "description",
                // "modified",
                "thumbnail_path",
                "thumbnail_extension",
                "resourceURI",
                "comics_available",
                "comics_collectionURI",
                "comics_items_0_resourceURI",
                "comics_items_0_name",
                "comics_items_1_resourceURI",
                "comics_items_1_name",
                "comics_items_2_resourceURI",
                "comics_items_2_name",
                "comics_items_3_resourceURI",
                "comics_items_3_name",
                "comics_items_4_resourceURI",
                "comics_items_4_name",
                "comics_items_5_resourceURI",
                "comics_items_5_name",
                "comics_items_6_resourceURI",
                "comics_items_6_name",
                "comics_items_7_resourceURI",
                "comics_items_7_name",
                "comics_items_8_resourceURI",
                "comics_items_8_name",
                "comics_items_9_resourceURI",
                "comics_items_9_name",
                "comics_items_10_resourceURI",
                "comics_items_10_name",
                "comics_returned",
                "series_available",
                "series_collectionURI",
                "series_items_0_resourceURI",
                "series_items_0_name",
                "series_items_1_resourceURI",
                "series_items_1_name",
                "series_returned",
                "stories_available",
                "stories_collectionURI",
                "stories_items_0_resourceURI",
                "stories_items_0_name",
                "stories_items_0_type",
                "stories_items_1_resourceURI",
                "stories_items_1_name",
                "stories_items_1_type",
                "stories_items_2_resourceURI",
                "stories_items_2_name",
                "stories_items_2_type",
                "stories_items_3_resourceURI",
                "stories_items_3_name",
                "stories_items_3_type",
                "stories_items_4_resourceURI",
                "stories_items_4_name",
                "stories_items_4_type",
                "stories_items_5_resourceURI",
                "stories_items_5_name",
                "stories_items_5_type",
                "stories_items_6_resourceURI",
                "stories_items_6_name",
                "stories_items_6_type",
                "stories_items_7_resourceURI",
                "stories_items_7_name",
                "stories_items_7_type",
                "stories_items_8_resourceURI",
                "stories_items_8_name",
                "stories_items_8_type",
                "stories_items_9_resourceURI",
                "stories_items_9_name",
                "stories_items_9_type",
                "stories_items_10_resourceURI",
                "stories_items_10_name",
                "stories_items_10_type",
                "stories_items_11_resourceURI",
                "stories_items_11_name",
                "stories_items_11_type",
                "stories_items_12_resourceURI",
                "stories_items_12_name",
                "stories_items_12_type",
                "stories_items_13_resourceURI",
                "stories_items_13_name",
                "stories_items_13_type",
                "stories_items_14_resourceURI",
                "stories_items_14_name",
                "stories_items_14_type",
                "stories_items_15_resourceURI",
                "stories_items_15_name",
                "stories_items_15_type",
                "stories_items_16_resourceURI",
                "stories_items_16_name",
                "stories_items_16_type",
                "stories_returned",
                "events_available",
                "events_collectionURI",
                "events_items_0_resourceURI",
                "events_items_0_name",
                "events_returned",
                "urls_0_type",
                "urls_0_url",
                "urls_1_type",
                "urls_1_url",
                "urls_2_type",
                "urls_2_url",
                "comics_items_11_resourceURI",
                "comics_items_11_name",
                "comics_items_12_resourceURI",
                "comics_items_12_name",
                "comics_items_13_resourceURI",
                "comics_items_13_name",
                "comics_items_14_resourceURI",
                "comics_items_14_name",
                "comics_items_15_resourceURI",
                "comics_items_15_name",
                "comics_items_16_resourceURI",
                "comics_items_16_name",
                "comics_items_17_resourceURI",
                "comics_items_17_name",
                "comics_items_18_resourceURI",
                "comics_items_18_name",
                "comics_items_19_resourceURI",
                "comics_items_19_name",
                "series_items_2_resourceURI",
                "series_items_2_name",
                "series_items_3_resourceURI",
                "series_items_3_name",
                "series_items_4_resourceURI",
                "series_items_4_name",
                "series_items_5_resourceURI",
                "series_items_5_name",
                "series_items_6_resourceURI",
                "series_items_6_name",
                "series_items_7_resourceURI",
                "series_items_7_name",
                "series_items_8_resourceURI",
                "series_items_8_name",
                "series_items_9_resourceURI",
                "series_items_9_name",
                "series_items_10_resourceURI",
                "series_items_10_name",
                "series_items_11_resourceURI",
                "series_items_11_name",
                "series_items_12_resourceURI",
                "series_items_12_name",
                "series_items_13_resourceURI",
                "series_items_13_name",
                "series_items_14_resourceURI",
                "series_items_14_name",
                "series_items_15_resourceURI",
                "series_items_15_name",
                "series_items_16_resourceURI",
                "series_items_16_name",
                "series_items_17_resourceURI",
                "series_items_17_name",
                "series_items_18_resourceURI",
                "series_items_18_name",
                "series_items_19_resourceURI",
                "series_items_19_name",
                "stories_items_17_resourceURI",
                "stories_items_17_name",
                "stories_items_17_type",
                "stories_items_18_resourceURI",
                "stories_items_18_name",
                "stories_items_18_type",
                "stories_items_19_resourceURI",
                "stories_items_19_name",
                "stories_items_19_type",
                "events_items_1_resourceURI",
                "events_items_1_name",
                "events_items_2_resourceURI",
                "events_items_2_name",
                "events_items_3_resourceURI",
                "events_items_3_name",
                "events_items_4_resourceURI",
                "events_items_4_name",
                "events_items_5_resourceURI",
                "events_items_5_name",
                "events_items_6_resourceURI",
                "events_items_6_name",
                "events_items_7_resourceURI",
                "events_items_7_name",
                "events_items_8_resourceURI",
                "events_items_8_name",
                "events_items_9_resourceURI",
                "events_items_9_name",
                "events_items_10_resourceURI",
                "events_items_10_name",
                "events_items_11_resourceURI",
                "events_items_11_name",
                "events_items_12_resourceURI",
                "events_items_12_name",
                "events_items_13_resourceURI",
                "events_items_13_name",
                "events_items_14_resourceURI",
                "events_items_14_name",
                "events_items_15_resourceURI",
                "events_items_15_name",
                "events_items_16_resourceURI",
                "events_items_16_name",
                "events_items_17_resourceURI",
                "events_items_17_name",
                "events_items_18_resourceURI",
                "events_items_18_name",
                "events_items_19_resourceURI",
                "events_items_19_name",
                "thumb_small",
                "thumb_large",
            ],
            fe_displayTitleOverrides:
            { // these are to be tuples - the values must be unique as well
                "name": "Name",
                "description": "Description",
                "modified": "Last Modified"
            },
            fe_filters_fabricatedFilters:
            [
                {
                    title: "Image",
                    choices: [
                        {
                            title: "Has image",
                            $match: {
                                "rowParams.thumb_large": {
                                    $exists: true,
                                    $nin: [ "http://i.annihil.us/u/prod/marvel/i/mg/b/40/image_not_available.jpg", null ]
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
                "events_available",
                "series_available",
                "stories_available",
                "comics_available",
                "description",
                "name",
            ],
            //
            //
            fe_chart_defaultGroupByColumnName_humanReadable: "Comics",
            fe_chart_fieldsNotAvailableAsGroupByColumns:
            [
                "name",
                "description",
            ],
            fe_chart_valuesToExcludeByOriginalKey:
            {
                _all: [ "", null, "NULL", "(not specified)", "NA" ],
            },
            //
            //
            fe_timeline_defaultGroupByColumnName_humanReadable: "Decade",
            fe_timeline_durationsAvailableForGroupBy:
            [
                "Decade",
                "Year",
                "Month",
                "Day"
            ],
            fe_timeline_defaultSortByColumnName_humanReadable: "Last Modified",
            fe_timeline_fieldsNotAvailableAsSortByColumns:
            [
                "name",
                "description",
                "Comics",
                "Series",
                "Events"
            ],
            //
            //
            // This is implemented but currently not used (it was built for scraping)
            afterGeneratingProcessedRowObjects_setupBefore_eachRowFn: function(appCtx, eachCtx, cb)
            {
                // Setup each ctx, such as the batch operation
                // Setup each ctx, such as the batch operation
                var srcDoc_uid = "marvel_character_database";
                var srcDoc_importRevision = 1; // INSERT YOUR IMPORT REVISION
                // An accessor factory function that just combines the values in a 
                            
                var srcDoc_pKey = appCtx.raw_source_documents_controller.NewCustomPrimaryKeyStringWithComponents(srcDoc_uid, srcDoc_importRevision);           
                var forThisDataSource_mongooseContext = appCtx.processed_row_objects_controller.Lazy_Shared_ProcessedRowObject_MongooseContext(srcDoc_pKey);            
                // ^ there is only one mongooseContext in raw_source_documents_controller because there is only one src docs collection,
                // but there are many mongooseContexts derivable/in raw_row_objects_controller because there is one collection of processed row objects per src doc
                var forThisDataSource_rowObjects_modelName = forThisDataSource_mongooseContext.Model.modelName;
                var forThisDataSource_RawRowObject_model = forThisDataSource_mongooseContext.Model.model;
                var forThisDataSource_nativeCollection = forThisDataSource_mongooseContext.Model.collection;
            
                
                // specify (and cache/store) an operating spec for the field merge operation
                eachCtx.mergeFieldsValuesIntoFieldArray_generateFieldNamed__Comics = "Comics";
                eachCtx.mergeFieldsValuesIntoFieldArray_withValuesInFieldsNamed__Comics = 
                [
                    "comics_items_0_name",
                    "comics_items_1_name",
                    "comics_items_2_name",
                    "comics_items_3_name",
                    "comics_items_4_name",
                    "comics_items_5_name",
                    "comics_items_6_name",
                    "comics_items_7_name",
                    "comics_items_8_name",
                    "comics_items_9_name",
                    "comics_items_10_name",
                    "comics_items_11_name",
                    "comics_items_12_name",
                    "comics_items_13_name",
                    "comics_items_14_name",
                    "comics_items_15_name",
                    "comics_items_16_name",
                    "comics_items_17_name",
                    "comics_items_18_name",
                    "comics_items_19_name",
                    "comics_items_20_name",
                ];
                //
                //
                eachCtx.mergeFieldsValuesIntoFieldArray_generateFieldNamed__Series = "Series";
                eachCtx.mergeFieldsValuesIntoFieldArray_withValuesInFieldsNamed__Series = 
                [
                    "series_items_0_name",
                    "series_items_1_name",
                    "series_items_2_name",
                    "series_items_3_name",
                    "series_items_4_name",
                    "series_items_5_name",
                    "series_items_6_name",
                    "series_items_7_name",
                    "series_items_8_name",
                    "series_items_9_name",
                    "series_items_10_name",
                    "series_items_11_name",
                    "series_items_12_name",
                    "series_items_13_name",
                    "series_items_14_name",
                    "series_items_15_name",
                    "series_items_16_name",
                    "series_items_17_name",
                    "series_items_18_name",
                    "series_items_19_name",
                    "series_items_20_name",
                ];
                //
                //
                eachCtx.mergeFieldsValuesIntoFieldArray_generateFieldNamed__Events = "Events";
                eachCtx.mergeFieldsValuesIntoFieldArray_withValuesInFieldsNamed__Events = 
                [
                    "events_items_0_name",
                    "events_items_1_name",
                    "events_items_2_name",
                    "events_items_3_name",
                    "events_items_4_name",
                    "events_items_5_name",
                    "events_items_6_name",
                    "events_items_7_name",
                    "events_items_8_name",
                    "events_items_9_name",
                    "events_items_10_name",
                    "events_items_11_name",
                    "events_items_12_name",
                    "events_items_13_name",
                    "events_items_14_name",
                    "events_items_15_name",
                    "events_items_16_name",
                    "events_items_17_name",
                    "events_items_18_name",
                    "events_items_19_name",
                    "events_items_20_name",
                ];
                //
                //
                // generate a bulk operation for our merge field values operations that we're going to do
                var mergeFieldsValuesIntoFieldArray_bulkOperation = forThisDataSource_nativeCollection.initializeUnorderedBulkOp();
                // store it into the "each-row" context for access during the each row operations
                eachCtx.mergeFieldsValuesIntoFieldArray_bulkOperation = mergeFieldsValuesIntoFieldArray_bulkOperation; 
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
                    mergeManyFieldsIntoOne(eachCtx.mergeFieldsValuesIntoFieldArray_generateFieldNamed__Comics, eachCtx.mergeFieldsValuesIntoFieldArray_withValuesInFieldsNamed__Comics);
                    mergeManyFieldsIntoOne(eachCtx.mergeFieldsValuesIntoFieldArray_generateFieldNamed__Series, eachCtx.mergeFieldsValuesIntoFieldArray_withValuesInFieldsNamed__Series);
                    mergeManyFieldsIntoOne(eachCtx.mergeFieldsValuesIntoFieldArray_generateFieldNamed__Events, eachCtx.mergeFieldsValuesIntoFieldArray_withValuesInFieldsNamed__Events);
                    //
                    function mergeManyFieldsIntoOne(generateFieldNamed, withValuesInFieldsNamed) {
                        var generatedArray = [];
                        //
                        for (var i = 0 ; i < withValuesInFieldsNamed.length; i++) {
                            var fieldName = withValuesInFieldsNamed[i];
                            var fieldValue = rowDoc["rowParams"][fieldName];
                            if (typeof fieldValue !== 'undefined' && fieldValue !== null && fieldValue !== "") {
                                generatedArray.push(fieldValue);
                            }
                        }
                        //
                        //
                        var persistableValue = generatedArray;                

                        var updateFragment = { $addToSet: {} };
                        updateFragment["$addToSet"]["rowParams." + generateFieldNamed] = { "$each": persistableValue };

                        var bulkOperationQueryFragment = 
                        {
                            pKey: rowDoc.pKey, // the specific row
                            srcDocPKey: rowDoc.srcDocPKey // of its specific source (parent) document
                        };
                        eachCtx.mergeFieldsValuesIntoFieldArray_bulkOperation.find(bulkOperationQueryFragment).upsert().update(updateFragment);
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

                // Finished iterating … execute the batch operation
                var writeConcern =
                {
                    upsert: true // might as well - but this is not necessary
                };
                eachCtx.mergeFieldsValuesIntoFieldArray_bulkOperation.execute(writeConcern, function(err, result)
                // changed from: bulkOperation.execute(writeConcern, function(err, result)
                {
                    if (err) {
                        winston.error("❌ [" + (new Date()).toString() + "] Error while saving raw row objects: ", err);
                    } else {
                        winston.info("✅  [" + (new Date()).toString() + "] Saved raw row objects.");
                    }
                    cb(err); // all done - must call DB
                });
            }
        }
    ]
