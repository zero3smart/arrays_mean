var winston = require('winston');
var Batch = require('batch');
var queryString = require('querystring');
//
var importedDataPreparation = require('../../../libs/datasources/imported_data_preparation');
var datasource_description = require('../../../models/descriptions');
var raw_source_documents = require('../../../models/raw_source_documents');
var processed_row_objects = require('../../../models/processed_row_objects');
var config = require('../config');
var func = require('../func');
var datatypes = require('../../../libs/datasources/datatypes');
var User = require('../../../models/users');

module.exports.BindData = function (req, source_pKey, rowObject_id,askForPreview, callback) {
    var self = this;

    importedDataPreparation.DataSourceDescriptionWithPKey(askForPreview,source_pKey)
        .then(function (dataSourceDescription) {


            var processedRowObjects_mongooseContext = processed_row_objects.Lazy_Shared_ProcessedRowObject_MongooseContext(dataSourceDescription._id);
            var processedRowObjects_mongooseModel = processedRowObjects_mongooseContext.Model;

            var rowObject;
            var relationshipField;
            var relationshipSource_uid;
            var relationshipSource_importRevision;

            var batch = new Batch()
            batch.concurrency(1);

            batch.push(function (done) {


                processedRowObjects_mongooseModel.findById(rowObject_id, function (err, _rowObject) {
                    if (err) return done(err);

                    rowObject = _rowObject;
                    done();
                });
            });

            var galleryViewSettings = dataSourceDescription.fe_views.views.gallery || dataSourceDescription.fe_views.views.timeline;
            var galleryItem_htmlWhenMissingImage;

            if (galleryViewSettings.galleryItemConditionsForIconWhenMissingImage) {
                var cond = galleryViewSettings.galleryItemConditionsForIconWhenMissingImage;

               var checkConditionAndApplyClasses = function (conditions, value,multiple) {

                    if (typeof value == 'undefined' || value == "" || value == null) {
                        return '<span class="icon-tile-null"></span>';
                    }
                    for (var i = 0; i < conditions.length; i++) {


                        if (value == conditions[i].value) {

                            if (conditions[i].applyIconFromUrl) {
                                if (multiple) {
                                    return "<img class='icon-tile category-icon-2' src='https://" + process.env.AWS_S3_BUCKET + ".s3.amazonaws.com/" + dataSourceDescription._team.subdomain + conditions[i].applyIconFromUrl + "'>"
                                }

                                return "<img class='icon-tile' src='https://" + process.env.AWS_S3_BUCKET + ".s3.amazonaws.com/" + dataSourceDescription._team.subdomain + conditions[i].applyIconFromUrl + "'>"
                            } else if (conditions[i].applyClass) {
                                // hard coded color-gender , as it is the only default icon category for now
                                return "<span class='" + conditions[i].applyClass + " color-gender'></span>";
                            }

                        }
                    }
                    return null;
                }

                galleryItem_htmlWhenMissingImage = function (rowObject) {
                    var fieldName = cond.field;
                    var conditions = cond.conditions;
                    var htmlElem = "";


                    var fieldValue = rowObject["rowParams"][fieldName];


                    if (Array.isArray(fieldValue) === true) {

                        for (var i = 0; i < fieldValue.length; i++) {
                            htmlElem += checkConditionAndApplyClasses(conditions, fieldValue[i],true);
                        }

                    } else if (typeof fieldValue == "string") {
                        htmlElem = checkConditionAndApplyClasses(conditions, fieldValue);

                    }
                    return htmlElem;
                };
            }


            batch.push(function (done) {
                var afterImportingAllSources_generate = dataSourceDescription.relationshipFields;
                if (typeof afterImportingAllSources_generate !== 'undefined') {

                    var batch = new Batch();
                    batch.concurrency(1);

                    afterImportingAllSources_generate.forEach(function (afterImportingAllSources_generate_description) {
                        batch.push(function (done) {
                            if (afterImportingAllSources_generate_description.relationship == true) {


                                var by = afterImportingAllSources_generate_description.by;


                                var rowObjectsOfRelationship_mongooseContext = processed_row_objects.Lazy_Shared_ProcessedRowObject_MongooseContext(by.joinDataset);
                                var rowObjectsOfRelationship_mongooseModel = rowObjectsOfRelationship_mongooseContext.Model;
                                var field = afterImportingAllSources_generate_description.field;
                                var isSingular = afterImportingAllSources_generate_description.singular;
                                var valueInDocAtField = rowObject.rowParams[field];
                                var findQuery = {};
                                if (isSingular == true) {
                                    findQuery._id = valueInDocAtField;
                                } else {
                                    findQuery._id = {$in: valueInDocAtField};

                                }




                                relationshipField = field;
                                var fieldToAcquire ={ srcDocPKey:1,_id:1};
                                var needObjectTitle = true;

                                if (typeof dataSourceDescription.fe_objectShow_customHTMLOverrideFnsByColumnNames !== 'undefined'
                                    && dataSourceDescription.fe_objectShow_customHTMLOverrideFnsByColumnNames[field] &&
                                    dataSourceDescription.fe_objectShow_customHTMLOverrideFnsByColumnNames[field].showField &&
                                    dataSourceDescription.fe_objectShow_customHTMLOverrideFnsByColumnNames[field].showField.length > 0) {

                                    needObjectTitle = false;


                                    var wantedfield = dataSourceDescription.fe_objectShow_customHTMLOverrideFnsByColumnNames[field].showField;
                                    for(var i=0; i<wantedfield.length; i++) {
                                        fieldToAcquire["rowParams." + wantedfield[i]] = 1;
                                    }
                                }

                                datasource_description.findById(by.joinDataset,function(err,joinDS) {
                                    if (err) return done(err);


                                   relationshipSource_uid = joinDS.uid;
                                   relationshipSource_importRevision = joinDS.importRevision;
                                   if (needObjectTitle) {
                                        var objectTitle = joinDS.objectTitle;
                                        fieldToAcquire["rowParams." + objectTitle] = 1;


                                   }
                                   rowObjectsOfRelationship_mongooseModel.find(findQuery)
                                        .select(fieldToAcquire)
                                        .exec(function (err, hydrationFetchResults) {
                                            if (err) return done(err);
                                            var hydrationValue = isSingular ? hydrationFetchResults[0] : hydrationFetchResults;

                                            rowObject.rowParams[field] = hydrationValue; // a doc or list of docs

                                            done();
                                        });

                                })

                            } else {
                                done(); // nothing to hydrate
                            }
                        });

                    });

                    batch.end(done);
                } else {
                    done();
                }

            });

            var user = null;
            batch.push(function(done) {
                if (req.user) {
                    User.findById(req.user)
                        .populate('defaultLoginTeam')
                        .exec(function(err, doc) {
                            if (err) return done(err);
                            user = doc;
                            done();
                        });
                } else {
                    done();
                }
            });

            batch.end(function (err) {
                if (err) return callback(err);

                //
                var fieldsNotToLinkAsGalleryFilter_byColName = {}; // we will translate any original keys to human-readable later
                var fe_filters_fieldsNotAvailable = dataSourceDescription.fe_filters.fieldsNotAvailable;
                var fe_excludeFieldsObjDetail = dataSourceDescription.fe_excludeFieldsObjDetail || {};
                if (typeof fe_filters_fieldsNotAvailable !== 'undefined') {
                    var fe_filters_fieldsNotAvailable_length = fe_filters_fieldsNotAvailable.length;
                    for (var i = 0; i < fe_filters_fieldsNotAvailable_length; i++) {
                        var key = fe_filters_fieldsNotAvailable[i];
                        fieldsNotToLinkAsGalleryFilter_byColName[key] = true;
                    }
                }
                // format dates
                rowObject.rowParams = func.formatCoercedFieldsFromRowObject(rowObject, dataSourceDescription);

                //
                var colNames_sansObjectTitle = importedDataPreparation.HumanReadableFEVisibleColumnNamesWithSampleRowObject(rowObject, dataSourceDescription);
                // ^ to finalize:
                var idxOf_objTitle = colNames_sansObjectTitle.indexOf(importedDataPreparation.HumanReadableColumnName_objectTitle);
                if (idxOf_objTitle >= 0) {
                    colNames_sansObjectTitle.splice(idxOf_objTitle, 1);
                }

                // filter out fields excluded from object detail by user
                colNames_sansObjectTitle = colNames_sansObjectTitle.filter(function(field) {
                    return !fe_excludeFieldsObjDetail[field]; // !exclude = include
                });

                //
                var alphaSorted_colNames_sansObjectTitle = colNames_sansObjectTitle;

                //
                // Move the data structures to the human-readable keys so they are accessible by the template
                var fe_displayTitleOverrides = dataSourceDescription.fe_displayTitleOverrides || {};
                var originalKeys = Object.keys(fe_displayTitleOverrides);
                var originalKeys_length = originalKeys.length;
                for (var i = 0; i < originalKeys_length; i++) {
                    var originalKey = originalKeys[i];
                    var overrideTitle = fe_displayTitleOverrides[originalKey];
                    //
                    var valueAtOriginalKey = rowObject.rowParams[originalKey];
                    rowObject.rowParams[overrideTitle] = valueAtOriginalKey;
                    //
                    if (fieldsNotToLinkAsGalleryFilter_byColName[originalKey] == true) {
                        delete fieldsNotToLinkAsGalleryFilter_byColName[originalKey];
                        fieldsNotToLinkAsGalleryFilter_byColName[overrideTitle] = true; // replace with human-readable
                    }
                }

                var collatedJoinData = {}
                var collateJoinData = function(columnName) {
                    var relationshipData = rowObject.rowParams[columnName]
                    for(var i = 0; i < relationshipData.length; i++) {
                        var fieldId = relationshipData[i]._id
                        for(var fieldName in relationshipData[i].rowParams) {
                            var fieldData = relationshipData[i].rowParams[fieldName]
                            if(!collatedJoinData.hasOwnProperty(fieldName)) {
                                collatedJoinData[fieldName] = []
                            }
                            collatedJoinData[fieldName].push([fieldData, fieldId])
                        }
                    }
                    return collatedJoinData
                }

                var buildObjectLink = function(columnName, value, id) {



                    return relationshipSource_uid + "-r" + relationshipSource_importRevision + "/" + id;
                }

                //
                var default_filterJSON = undefined;
                if (typeof dataSourceDescription.fe_filters.default !== 'undefined') {
                    default_filterJSON = queryString.stringify("?" + dataSourceDescription.fe_filters.default || {}); // "|| {}" for safety
                }


                var i = source_pKey.indexOf('-');


                var splitSubdomain = source_pKey.substring(i+1,source_pKey.length);

                if (process.env.NODE_ENV == 'enterprise') {
                    splitSubdomain = source_pKey;
                }

                //
                var data =
                {
                    env: process.env,

                    user: user,

                    dataTypesConversion: dataSourceDescription.raw_rowObjects_coercionScheme,
                    datasetId: dataSourceDescription._id,


                    arrayTitle: dataSourceDescription.title,
                    array_source_key: splitSubdomain,
                    team: dataSourceDescription._team ? dataSourceDescription._team : null,
                    brandColor: dataSourceDescription.brandColor,
                    brandWhiteText: func.useLightBrandText(dataSourceDescription.brandColor),
                    default_filterJSON: default_filterJSON,
                    description: dataSourceDescription.description ? dataSourceDescription.description : "",
                    view_visibility: dataSourceDescription.fe_views.views ? dataSourceDescription.fe_views.views : {},
                    main_view: dataSourceDescription.fe_views.default_view ? dataSourceDescription.fe_views.default_view : 'gallery',
                    //
                    rowObject: rowObject,
                    //
                    fieldKey_objectTitle: dataSourceDescription.objectTitle,
                    //
                    hasOriginalImage:  (dataSourceDescription.fe_image && dataSourceDescription.fe_image.field) ? true: false,
                    fieldKey_originalImageURL: (dataSourceDescription.fe_image && dataSourceDescription.fe_image.field) ?
                    dataSourceDescription.fe_image.field: null,
                    scrapedImages: (dataSourceDescription.fe_image && dataSourceDescription.fe_image.field) ? dataSourceDescription.fe_image.scraped : null,

                    //
                    ordered_colNames_sansObjectTitleAndImages: alphaSorted_colNames_sansObjectTitle,
                    //
                    fieldsNotToLinkAsGalleryFilter_byColName: fieldsNotToLinkAsGalleryFilter_byColName,
                    //
                    fe_galleryItem_htmlForIconFromRowObjWhenMissingImage: galleryItem_htmlWhenMissingImage,


                    collateJoinData: collateJoinData,
                    relationshipField: relationshipField,
                    buildObjectLink: buildObjectLink,
                    uid: dataSourceDescription.uid,
                    defaultView: config.formatDefaultView(dataSourceDescription.fe_views.default_view),
                    isPreview: askForPreview
                };
                callback(null, data);
            });


        })


};