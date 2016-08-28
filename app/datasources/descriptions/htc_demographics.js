//
var winston = require('winston');
//
var import_datatypes = require('../utils/import_datatypes');
//
//
exports.Descriptions =
    [
        {
            filename: "HTC_Demographics.csv",
            fileEncoding: "utf8", // the default
            uid: "htc_demographics",
            importRevision: 2,
            format: import_datatypes.DataSource_formats.CSV,
            title: "HTC Demographics",
            brandColor: "#03A678",
            urls: [ "--" ],
            description: "--",
            fe_listed: false,
            fe_displayTitleOverrides: {

            }, // this is needed to not through an error
            //
            //
            fn_new_rowPrimaryKeyFromRowObject: function(rowObject, rowIndex)
            {
                return "" + rowIndex + "-" + rowObject["ID"]
            },
            raw_rowObjects_coercionScheme:
            {

            },
            //
            //
            fe_designatedFields:
            {
                objectTitle: "ID",
            },
            fe_views: {
                gallery: true,
                choropleth: false,
                chart: true,
                scatterplot: false,
                timeline: false,
                wordCloud: false,
                lineGraph: false
            },
            fe_excludeFields:
                [
                 "ID"   
                ],
            fe_outputInFormat:
            {

            },
            fe_filters_fieldsNotAvailable:
                [

                ],
            fe_filters_valuesToExcludeByOriginalKey:
            {
                _all: [ "", null ]
            },
            //
            fe_chart_defaultGroupByColumnName_humanReadable: "Rebuild Services",
            fe_chart_fieldsNotAvailableAsGroupByColumns:
                [
                "ID"

                ],
            fe_chart_valuesToExcludeByOriginalKey:
            {
                _all: [ "", null, "NULL", "(not specified)" ],
                Classification: [ "(not assigned)" ]
                
            },

            fe_galleryItem_htmlForIconFromRowObjWhenMissingImage: function(rowObject)
            {
                var gender = rowObject.rowParams["Gender"];
                var iconSpanClass = undefined;
                if (typeof gender === 'undefined' || gender == null || gender == "") {
                    iconSpanClass = "icon-tile-null";
                } else if (gender === "NULL") {
                    iconSpanClass = "icon-tile-null";
                } else {
                    var lowerCasedGender = gender.toLowerCase();
                    if (lowerCasedGender == "male" || lowerCasedGender == "female") {
                        iconSpanClass = "icon-tile-" + lowerCasedGender;
                    } else {
                        winston.warn("⚠️  Unrecognized non-NULL lowercased gender: ", gender + ". Defaulting.");
                    }
                }
                //
                if (typeof iconSpanClass === 'undefined') { // if for some reason…
                    winston.warn("⚠️  Unable to derive icon span class for artist with no image in fe_galleryItem_htmlForIconFromRowObjWhenMissingImage. Using default of 'null' icon.");
                    iconSpanClass = "icon-tile-null";
                }
                //
                return '<span class="' + iconSpanClass + ' color-gender"></span>';
            },
            //
            //
        }
    ];
