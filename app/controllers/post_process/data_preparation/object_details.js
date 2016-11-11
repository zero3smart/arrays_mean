var winston = require('winston');
var Batch = require('batch');
var queryString = require('querystring');
//
var importedDataPreparation = require('../../../datasources/utils/imported_data_preparation');
var raw_source_documents = require('../../../models/raw_source_documents');
var processed_row_objects = require('../../../models/processed_row_objects');
var config = require('../config');
var func = require('../func');
var import_datatypes = require('../../../datasources/utils/import_datatypes');

module.exports.BindData = function (req, source_pKey, rowObject_id, callback) {
    var self = this;

    importedDataPreparation.DataSourceDescriptionWithPKey(source_pKey)
        .then(function (dataSourceDescription) {

            var processedRowObjects_mongooseContext = processed_row_objects.Lazy_Shared_ProcessedRowObject_MongooseContext(source_pKey);
            var processedRowObjects_mongooseModel = processedRowObjects_mongooseContext.Model;

            var rowObject;

            var batch = new Batch()
            batch.concurrency(1);

            batch.push(function (done) {
                var query =
                {
                    _id: rowObject_id,
                    srcDocPKey: source_pKey
                };
                processedRowObjects_mongooseModel.findOne(query, function (err, _rowObject) {
                    if (err) return done(err);

                    rowObject = _rowObject;
                    done();
                });
            });

            var galleryItem_htmlWhenMissingImage;


            if (dataSourceDescription.fe_views.views.gallery.galleryItemConditionsForIconWhenMissingImage) {
                var cond = dataSourceDescription.fe_views.views.gallery.galleryItemConditionsForIconWhenMissingImage;
                var galleryItem_htmlWhenMissingImage = function (rowObject) {
                    var fieldName = cond.field;
                    var conditions = cond.conditions;
                    for (var i = 0; i < conditions.length; i++) {
                        if (conditions[i].operator == "in" && Array.isArray(conditions[i].value)) {


                            if (conditions[i].value.indexOf(rowObject["rowParams"][fieldName]) > 0) {

                                var string = conditions[i].applyClasses.toString();

                                var classes = string.replace(",", " ");


                                return '<span class="' + classes + '"</span>';
                            }
                        } else if (conditions[i].operator == "equal") {
                            if (conditions[i].value == rowObject["rowParams"][fieldName]) {

                                var string = conditions[i].applyClasses.toString();


                                var classes = string.replace(",", " ");

                                return '<span class="' + classes + '"</span>';
                            }
                        }
                    }


                }
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
                                var relationshipSource_uid = by.ofOtherRawSrcUID;
                                var relationshipSource_importRevision = by.andOtherRawSrcImportRevision;
                                var relationshipSource_pKey = raw_source_documents.NewCustomPrimaryKeyStringWithComponents(relationshipSource_uid, relationshipSource_importRevision);
                                var rowObjectsOfRelationship_mongooseContext = processed_row_objects.Lazy_Shared_ProcessedRowObject_MongooseContext(relationshipSource_pKey);
                                var rowObjectsOfRelationship_mongooseModel = rowObjectsOfRelationship_mongooseContext.Model;
                                //
                                var field = afterImportingAllSources_generate_description.field;
                                var isSingular = afterImportingAllSources_generate_description.singular;
                                var valueInDocAtField = rowObject.rowParams[field];
                                var findQuery = {};
                                if (isSingular == true) {
                                    findQuery._id = valueInDocAtField;
                                } else {
                                    findQuery._id = {$in: valueInDocAtField};
                                }
                                var fieldToAcquire = {};
                                if (typeof dataSourceDescription.fe_objectShow_customHTMLOverrideFnsByColumnName !== 'undefined') {
                                    fieldToAcquire ={ srcDocPKey:1,_id:1};
                                    var wantedfield = dataSourceDescription.fe_objectShow_customHTMLOverrideFnsByColumnName[field].showField;
                                    fieldToAcquire["rowParams."+wantedfield] = 1;
                                }
                                rowObjectsOfRelationship_mongooseModel.find(findQuery)
                                .select(fieldToAcquire)
                                .exec(function (err, hydrationFetchResults) {
                                    if (err) return done(err);

                                    var hydrationValue = isSingular ? hydrationFetchResults[0] : hydrationFetchResults;
                                    rowObject.rowParams[field] = hydrationValue; // a doc or list of docs
                                    //
                                    done();
                                });
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

            batch.end(function (err) {
                if (err) return callback(err);

                //
                var fieldsNotToLinkAsGalleryFilter_byColName = {}; // we will translate any original keys to human-readable later
                var fe_filters_fieldsNotAvailable = dataSourceDescription.fe_filters.fieldsNotAvailable;
                if (typeof fe_filters_fieldsNotAvailable !== 'undefined') {
                    var fe_filters_fieldsNotAvailable_length = fe_filters_fieldsNotAvailable.length;
                    for (var i = 0; i < fe_filters_fieldsNotAvailable_length; i++) {
                        var key = fe_filters_fieldsNotAvailable[i];
                        fieldsNotToLinkAsGalleryFilter_byColName[key] = true;
                    }
                }
                //
                // Format any coerced fields as necessary - BEFORE we translate the keys into human readable forms
                var rowParams = rowObject.rowParams;
                var rowParams_keys = Object.keys(rowParams);
                var rowParams_keys_length = rowParams_keys.length;
                for (var i = 0; i < rowParams_keys_length; i++) {
                    var key = rowParams_keys[i];
                    var originalVal = rowParams[key];
                    var displayableVal = func.reverseDataToBeDisplayableVal(originalVal, key, dataSourceDescription);
                    
                    if ( isNaN(displayableVal) == false && dataSourceDescription.raw_rowObjects_coercionScheme[key] && 
                        dataSourceDescription.raw_rowObjects_coercionScheme[key].operation== "ToInteger") {
                        displayableVal = import_datatypes.displayNumberWithComma(displayableVal)
                    }
                    rowParams[key] = displayableVal;
                }
                //
                var colNames_sansObjectTitle = importedDataPreparation.HumanReadableFEVisibleColumnNamesWithSampleRowObject(rowObject, dataSourceDescription);
                // ^ to finalize:
                var idxOf_objTitle = colNames_sansObjectTitle.indexOf(importedDataPreparation.HumanReadableColumnName_objectTitle);
                if (idxOf_objTitle >= 0) {
                    colNames_sansObjectTitle.splice(idxOf_objTitle, 1);
                }
                //
                var alphaSorted_colNames_sansObjectTitle = colNames_sansObjectTitle;
                //
                var designatedOriginalImageField = dataSourceDescription.fe_designatedFields.originalImageURL;
                var hasDesignatedOriginalImageField = designatedOriginalImageField ? true : false;
                var rowObjectHasOriginalImage = false;
                if (hasDesignatedOriginalImageField) {
                    var valueAtOriginalImageField = rowObject.rowParams[designatedOriginalImageField];
                    if (typeof valueAtOriginalImageField !== 'undefined' && valueAtOriginalImageField != null && valueAtOriginalImageField != "") {
                        rowObjectHasOriginalImage = true;
                    }
                }
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

                var fe_objectShow_customHTMLOverrideFnsByColumnName = {};

                if (typeof dataSourceDescription.fe_objectShow_customHTMLOverrideFnsByColumnName !== 'undefined') {

                    for (var relationshipFieldName in dataSourceDescription.fe_objectShow_customHTMLOverrideFnsByColumnName) {
                        
                        fe_objectShow_customHTMLOverrideFnsByColumnName[relationshipFieldName] = function (rowObject, eachValue, strParams) {
                            var relationshipObjectShowLink = "/array/" + eachValue.srcDocPKey + "/" + eachValue._id;
                            if (strParams && strParams != '') relationshipObjectShowLink += '?' + strParams;

                            var classes = dataSourceDescription.fe_objectShow_customHTMLOverrideFnsByColumnName[relationshipFieldName].classes.toString().replace(",", " ");

                            var openingTag = '<a href="' + relationshipObjectShowLink + '" class=' + classes + '">';
                            var tagContent = eachValue.rowParams[dataSourceDescription.fe_objectShow_customHTMLOverrideFnsByColumnName[relationshipFieldName].showField];
                            var closingTag = '</a>';
                            return openingTag + tagContent + closingTag;

                        }

                    }

                }


                //
                var default_filterJSON = undefined;
                if (typeof dataSourceDescription.fe_filters.default !== 'undefined') {
                    default_filterJSON = queryString.stringify(dataSourceDescription.fe_filters.default || {}); // "|| {}" for safety
                }

                //
                var data =
                {
                    env: process.env,

                    user: req.user,

                    arrayTitle: dataSourceDescription.title,
                    array_source_key: source_pKey,
                    team: dataSourceDescription._team ? dataSourceDescription._team : null,
                    brandColor: dataSourceDescription.brandColor,
                    default_filterJSON: default_filterJSON,
                    view_visibility: dataSourceDescription.fe_views.views ? dataSourceDescription.fe_views.views : {},
                    main_view: dataSourceDescription.fe_views.default_view ? dataSourceDescription.fe_views.default_view : 'gallery',
                    //
                    rowObject: rowObject,
                    //
                    fieldKey_objectTitle: dataSourceDescription.fe_designatedFields.objectTitle,
                    //
                    fieldKey_originalImageURL: hasDesignatedOriginalImageField ? designatedOriginalImageField : undefined,
                    hasOriginalImage: rowObjectHasOriginalImage,
                    //
                    ordered_colNames_sansObjectTitleAndImages: alphaSorted_colNames_sansObjectTitle,
                    //
                    fieldsNotToLinkAsGalleryFilter_byColName: fieldsNotToLinkAsGalleryFilter_byColName,
                    //
                    fe_objectShow_customHTMLOverrideFnsByColumnName: fe_objectShow_customHTMLOverrideFnsByColumnName,

                    fe_galleryItem_htmlForIconFromRowObjWhenMissingImage: dataSourceDescription.fe_galleryItem_htmlForIconFromRowObjWhenMissingImage
                };
                callback(null, data);
            });


        })


};