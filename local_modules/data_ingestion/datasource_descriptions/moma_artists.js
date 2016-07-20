//
var winston = require('winston');
//
var import_datatypes = require('../import_datatypes');
var import_processing = require('../import_processing');
//
//
exports.Descriptions =
    [
        //
        // Production - Invisible - Nationality <-> Country -
        {
            filename: "Countries-to-Demonyms.csv",
            fileEncoding: "utf8", // default
            uid: "countries_to_demonyms",
            importRevision: 1,
            format: import_datatypes.DataSource_formats.CSV,
            title: "Countries to Demonyms",
            fe_visible: false,
            //
            fn_new_rowPrimaryKeyFromRowObject: function(rowObject, rowIndex)
            {
                return "" + rowIndex + "-" + rowObject["ISO 3166 Code"]
            }
        },
        //
        // Production - Visible - MoMA dataset
        {
            filename: "MoMA_Artists_v1_jy.csv",
            fileEncoding: "utf8", // the default
            uid: "moma_artists",
            importRevision: 1,
            format: import_datatypes.DataSource_formats.CSV,
            title: "MoMA Artists",
            brandColor: "#005cff",
            urls: [ "http://zenodo.org/record/46902" ],
            description: "Basic catalog information for artists with works in the collection of The Museum of Modern Art (MoMA), including artist name, nationality, gender, birth year, death year, Wiki QID and Getty ULAN ID. ",
            //
            //
            fn_new_rowPrimaryKeyFromRowObject: function(rowObject, rowIndex)
            {
                return "" + rowIndex + "-" + rowObject["ConstituentID"]
            },
            raw_rowObjects_coercionScheme:
            {
                BeginDate: {
                    do: import_datatypes.Coercion_ops.ToDate,
                    opts: import_datatypes.Coercion_optionsPacks.ToDate.FourDigitYearOnly
                },
                EndDate: {
                    do: import_datatypes.Coercion_ops.ToDate,
                    opts: import_datatypes.Coercion_optionsPacks.ToDate.FourDigitYearOnly
                }
            },
            //
            //
            afterImportingAllSources_generate:
                [
                    {
                        field: "Country of Origin",
                        singular: true,
                        by: {
                            doing: import_processing.Ops.Join,
                            matchFn: import_processing.MatchFns.LocalContainsForeignString, // look for Demonym in Nationality, rather than Nationality in Demonym
                            matchRegex: import_processing.MatchRegexs.RegexLocalContainsForeignString,
                            findingMatchOnFields: [ "Demonym 1", "Demonym 2", "Demonym 3" ],
                            ofOtherRawSrcUID: "countries_to_demonyms",
                            andOtherRawSrcImportRevision: 1,
                            withLocalField: "Nationality",
                            obtainingValueFromField: "Name"
                        }
                    },
                    {
                        field: "Artworks",
                        singular: false,
                        relationship: true, // obtaining the _id instead of a field value, and will be hydrated with
                        // associated objects on API data prep instead of being sent along as primitive values
                        by: {
                            doing: import_processing.Ops.Join,
                            matchFn: import_processing.MatchFns.LocalEqualsForeignString,
                            matchRegex: import_processing.MatchRegexs.RegexLocalEqualsForeignString,
                            findingMatchOnFields: [ "Artist" ],
                            ofOtherRawSrcUID: "moma_artworks",
                            andOtherRawSrcImportRevision: 2,
                            withLocalField: "DisplayName"
                            // note we do not obtain a value from a field since this is a relationship-forming join
                            // and a flag here saying "obtainingRelationship=true" would be redundant
                        }
                    }
                ],
            //
            //
            fe_designatedFields:
            {
                objectTitle: "DisplayName",
                originalImageURL: null, // not strictly necessary to define as null but done for explicitness
                medThumbImageURL: null // not strictly necessary to define as null but done for explicitness
            },
            fe_excludeFields:
                [
                    "ConstituentID" // not sure if we really want to exclude this
                ],
            fe_displayTitleOverrides:
            {
                // these are to be tuples - the values must be unique as well
                "Code" : "Gender",
                "DisplayDate" : "Bio",
                "BeginDate" : "Date of Birth",
                "EndDate" : "Date of Death"
            },
            //
            fe_filters_fieldsNotAvailable:
                [
                    "DisplayName", // because they're effectively unique
                    "Artworks", // it's an array of doc ids
                    "DisplayDate",
                    "BeginDate",
                    "EndDate",
                    "Wiki QID",
                    "ULAN",
                ],
            fe_filters_oneToOneOverrideWithValuesByTitleByFieldName:
            {
                "Gender": {
                    "Male": "Male",
                    "Female": "Female",
                    "Not Specified": "NULL"
                }
            },
            //
            fe_filters_valuesToExcludeByOriginalKey:
            {
                _all: [ "", null ],
                "Nationality" : [ "NULL", "Nationality unknown", "nationality unknown", "Nationality Unknown" ]
            },
            //
            fe_chart_defaultGroupByColumnName_humanReadable: "Nationality",
            fe_chart_fieldsNotAvailableAsGroupByColumns:
                [
                    "DisplayName", // because they're effectively unique
                    "Artworks", // it's an array of doc ids
                    "DisplayDate",
                    "Wiki QID",
                    "ULAN"
                ],
            fe_chart_valuesToExcludeByOriginalKey:
            {
                _all: [ "", null, "NULL", "(not specified)" ],
                Nationality: [ "Nationality unknown", "nationality unknown", "Nationality Unknown" ]
            },
            //
            //
            fe_choropleth_defaultMapByColumnName_humanReadable: "Country of Origin",
            fe_choropleth_fieldsNotAvailableAsMapByColumns:
                [
                    "DisplayName",
                    "Artworks", // it's an array of doc ids
                    "Code",
                    "Nationality",
                    "DisplayDate",
                    "BeginDate",
                    "EndDate",
                    "Wiki QID",
                    "ULAN"
                ],
            //
            //
            fe_galleryItem_htmlForIconFromRowObjWhenMissingImage: function(rowObject)
            {
                var gender = rowObject.rowParams["Code"];
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
            fe_objectShow_customHTMLOverrideFnsByColumnName:
            {
                "Artworks": function(rowObject, eachValue)
                {
                    var relationshipObjectShowLink = "/array/" + eachValue.srcDocPKey + "/" + eachValue._id;
                    var openingTag = '<a href="' + relationshipObjectShowLink + '" class="color-brand">';
                    var tagContent = eachValue.rowParams.Title;
                    var closingTag = '</a>';
                    //
                    return openingTag + tagContent + closingTag;
                }
            }
        },
        {
            filename: "MoMA_Artworks_v2_jy.csv",
            fileEncoding: "utf8", // the default
            uid: "moma_artworks",
            importRevision: 2,
            format: import_datatypes.DataSource_formats.CSV,
            title: "MoMA Artworks",
            urls: [ "https://github.com/MuseumofModernArt/collection" ],
            description: "This research dataset contains 126,713 records, representing all of the works that have been accessioned into MoMA’s collection and cataloged in our database.",
            //
            //
            fn_new_rowPrimaryKeyFromRowObject: function(rowObject, rowIndex)
            {
                return "" + rowIndex + "-" + rowObject["ObjectID"]
            },
            raw_rowObjects_coercionScheme:
            {
                DateAcquired: {
                    do: import_datatypes.Coercion_ops.ToDate,
                    opts: {
                        format: "YYYY-MM-DD" // e.g. "2009-03-21"
                    }
                },
                Date: {
                    do: import_datatypes.Coercion_ops.ToDate,
                    opts: import_datatypes.Coercion_optionsPacks.ToDate.FourDigitYearOnly
                }
            },
            //
            //
            fe_designatedFields:
            {
                objectTitle: "Title",
                originalImageURL: "imgURL_original",
                medThumbImageURL: "imgURL_gridThumb"
            },
            fe_excludeFields:
                [
                    "ObjectID", // not sure if we really want to exclude this
                    //
                    "imgURL_original",
                    "imgURL_gridThumb"
                ],
            fe_displayTitleOverrides:
            { // these are to be tuples - the values must be unique as well
                "CuratorApproved": "Curator Approved",
                "DateAcquired": "Date Acquired",
                "CreditLine": "Credit Line",
                "ArtistBio": "Artist Bio",
                "MoMANumber": "MoMA Number"
            },
            fe_outputInFormat:
            {
                DateAcquired: {
                    format: "MMMM Do, YYYY"
                }
            },
            //
            fe_filters_default:
            {
                "Image": [ "Has image" ]
            },
            fe_filters_fieldsNotAvailable:
                [
                    "Title", // they're almost exclusively unique
                    "ArtistBio",
                    "Dimensions",
                    "CreditLine",
                    "MoMANumber",
                    "DateAcquired",
                    "URL",
                    "Date"
                ],
            fe_filters_oneToOneOverrideWithValuesByTitleByFieldName:
            {
                "Artist Gender": {
                    "Male": "Male",
                    "Female": "Female",
                    "Not Specified": "NULL"
                }
            },
            fe_filters_valuesToExcludeByOriginalKey:
            {
                _all: [ "", null ]
            },
            fe_filters_fabricatedFilters:
                [
                    {
                        title: "Image",
                        choices: [
                            {
                                title: "Has image",
                                $match: {
                                    "rowParams.imgURL_gridThumb": {
                                        $exists: true,
                                        $nin: [ "", null ]
                                    }
                                }
                            }
                        ]
                    },
                    {
                        title: "Object Title",
                        choices: [
                            {
                                title: "Has Title",
                                $match: {
                                    "rowParams.Title": {
                                        $exists: true,
                                        $nin: [ "", null ]
                                    }
                                }
                            }
                        ]
                    }
                ],
            //
            //
            fe_galleryItem_htmlForIconFromRowObjWhenMissingImage: function(rowObject)
            {
                var gender = rowObject.rowParams["Artist Gender"];
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
            fe_chart_defaultGroupByColumnName_humanReadable: "Artist Gender",
            fe_chart_fieldsNotAvailableAsGroupByColumns:
                [
                    "Title", // they're almost exclusively unique
                    "ArtistBio",
                    "Dimensions",
                    "CreditLine",
                    "MoMANumber",
                    "DateAcquired",
                    "URL"
                ],
            fe_chart_valuesToExcludeByOriginalKey:
            {
                _all: [ "", null, "NULL", "(not specified)" ],
                Classification: [ "(not assigned)" ]
            },
            //
            //
            fe_choropleth_defaultMapByColumnName_humanReadable: "Country of Origin",
            fe_choropleth_fieldsNotAvailableAsMapByColumns:
                [
                    "Title",
                    "Artist",
                    "Artist Gender",
                    "ArtistBio",
                    "Dimensions",
                    "CreditLine",
                    "MoMANumber",
                    "Date",
                    "DateAcquired",
                    "URL",
                    "CuratorApproved",
                    "Classification",
                    "Department",
                    "Medium"
                ],
            //
            //
            afterImportingAllSources_generate:
                [
                    {
                        field: "Artist Gender",
                        singular: true, // there is only one gender per artwork's artist
                        by: {
                            doing: import_processing.Ops.Join,
                            matchFn: import_processing.MatchFns.LocalEqualsForeignString,
                            //matchRegex: import_processing.MatchRegexs.RegexLocalEqualsForeignString,
                            findingMatchOnFields: [ "DisplayName" ],
                            ofOtherRawSrcUID: "moma_artists",
                            andOtherRawSrcImportRevision: 1,
                            withLocalField: "Artist",
                            obtainingValueFromField: "Code"
                        }
                    },
                    {
                        field: "Country of Origin",
                        singular: true,
                        by: {
                            doing: import_processing.Ops.Join,
                            matchFn: import_processing.MatchFns.LocalContainsForeignString, // look for Demonym in ArtistBio, rather than ArtistBio in Demonym
                            //matchRegex: import_processing.MatchRegexs.RegexLocalContainsForeignString,
                            findingMatchOnFields: [ "Demonym 1", "Demonym 2", "Demonym 3" ],
                            ofOtherRawSrcUID: "countries_to_demonyms",
                            andOtherRawSrcImportRevision: 1,
                            withLocalField: "ArtistBio",
                            obtainingValueFromField: "Name"
                        }
                    }
                ],
            //
            //
            afterImportingAllSources_generateByScraping:
                [
                    {
                        htmlSourceAtURLInField: "URL",
                        imageSrcSetInSelector: "img.sov-hero__image-container__image@srcset",
                        prependToImageURLs: "http://www.moma.org", // since the urls are like "/media/…", not "http://…/media/…"
                        useAndHostSrcSetSizeByField: {
                            "imgURL_original": {
                                size: "2000w"
                            },
                            "imgURL_gridThumb": {
                                size: "640w"
                            }
                        }
                    }
                ]
            // //
            // //
            // // This is implemented but currently not used (it was built for scraping)
            // afterGeneratingProcessedRowObjects_setupBefore_eachRowFn: function(appCtx, eachCtx, cb)
            // {
            //     // Setup each ctx, such as the batch operation
            //     cb(null);
            // },
            // //
            // afterGeneratingProcessedRowObjects_eachRowFn: function(appCtx, eachCtx, rowDoc, cb)
            // {
            //     // console.log("A row", rowDoc)
            //     // perform derivations and add update operations to batch operation in eachCtx
            //     cb(null);
            // },
            // //
            // afterGeneratingProcessedRowObjects_afterIterating_eachRowFn: function(appCtx, eachCtx, cb)
            // {
            //     // Finished iterating … execute the batch operation
            //     cb(null);
            // }
            // //
            // //
        }
    ]
