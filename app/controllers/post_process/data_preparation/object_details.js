var winston = require('winston');
var Batch = require('batch');
var queryString = require('querystring');
//
var importedDataPreparation = require('../../../datasources/utils/imported_data_preparation');
var raw_source_documents = require('../../../models/raw_source_documents');
var config = new require('../config')();
var functions = new require('../functions')();

var constructor = function(options, context) {
    var self = this;
    self.options = options;
    self.context = context;

    return self;
};

//
constructor.prototype.BindData = function(source_pKey, rowObject_id, callback)
{
    var self = this;
    var dataSourceDescription = importedDataPreparation.DataSourceDescriptionWithPKey(source_pKey);

    var team = importedDataPreparation.TeamDescription(dataSourceDescription.team_id);

    var fe_visible = dataSourceDescription.fe_visible;
    if (typeof fe_visible !== 'undefined' && fe_visible != null && fe_visible === false) {
        callback(new Error("That data source was set to be not visible: " + source_pKey), null);

        return;
    }
    var processedRowObjects_mongooseContext = self.context.processed_row_objects_controller.Lazy_Shared_ProcessedRowObject_MongooseContext(source_pKey);
    var processedRowObjects_mongooseModel = processedRowObjects_mongooseContext.Model;

    var rowObject;

    var batch = new Batch()
    batch.concurrency(1);

    batch.push(function(done) {
        var query =
        {
            _id: rowObject_id,
            srcDocPKey: source_pKey
        };
        processedRowObjects_mongooseModel.findOne(query, function(err, _rowObject)
        {
            if (err) return done(err);

            rowObject = _rowObject;
            done();
        });
    });

    batch.push(function(done) {
        var afterImportingAllSources_generate = dataSourceDescription.afterImportingAllSources_generate;
        if (typeof afterImportingAllSources_generate !== 'undefined') {
            var batch = new Batch();
            batch.concurrency(1);

            afterImportingAllSources_generate.forEach(function(afterImportingAllSources_generate_description){
                batch.push(function(done) {
                    if (afterImportingAllSources_generate_description.relationship == true) {
                        var by = afterImportingAllSources_generate_description.by;
                        var relationshipSource_uid = by.ofOtherRawSrcUID;
                        var relationshipSource_importRevision = by.andOtherRawSrcImportRevision;
                        var relationshipSource_pKey = raw_source_documents.NewCustomPrimaryKeyStringWithComponents(relationshipSource_uid, relationshipSource_importRevision);
                        var rowObjectsOfRelationship_mongooseContext = self.context.processed_row_objects_controller.Lazy_Shared_ProcessedRowObject_MongooseContext(relationshipSource_pKey);
                        var rowObjectsOfRelationship_mongooseModel = rowObjectsOfRelationship_mongooseContext.Model;
                        //
                        var field = afterImportingAllSources_generate_description.field;
                        var isSingular = afterImportingAllSources_generate_description.singular;
                        var valueInDocAtField = rowObject.rowParams[field];
                        var findQuery = {};
                        if (isSingular == true) {
                            findQuery._id = valueInDocAtField;
                        } else {
                            findQuery._id = { $in: valueInDocAtField };
                        }
                        rowObjectsOfRelationship_mongooseModel.find(findQuery, function(err, hydrationFetchResults)
                        {
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

    batch.end(function(err) {
        if (err) return callback(err);

        //
        var fieldsNotToLinkAsGalleryFilter_byColName = {}; // we will translate any original keys to human-readable later
        var fe_filters_fieldsNotAvailable = dataSourceDescription.fe_filters_fieldsNotAvailable;
        if (typeof fe_filters_fieldsNotAvailable !== 'undefined') {
            var fe_filters_fieldsNotAvailable_length = fe_filters_fieldsNotAvailable.length;
            for (var i = 0 ; i < fe_filters_fieldsNotAvailable_length ; i++) {
                var key = fe_filters_fieldsNotAvailable[i];
                fieldsNotToLinkAsGalleryFilter_byColName[key] = true;
            }
        }
        //
        // Format any coerced fields as necessary - BEFORE we translate the keys into human readable forms
        var rowParams = rowObject.rowParams;
        var rowParams_keys = Object.keys(rowParams);
        var rowParams_keys_length = rowParams_keys.length;
        for (var i = 0 ; i < rowParams_keys_length ; i++) {
            var key = rowParams_keys[i];
            var originalVal = rowParams[key];
            var displayableVal = functions._reverseDataTypeCoersionToMakeFEDisplayableValFrom(originalVal, key, dataSourceDescription);
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
        for (var i = 0 ; i < originalKeys_length ; i++) {
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
        //
        var default_filterJSON = undefined;
        if (typeof dataSourceDescription.fe_filters_default !== 'undefined') {
            default_filterJSON = queryString.stringify(dataSourceDescription.fe_filters_default || {}); // "|| {}" for safety
        }
        //
        var data =
        {
            env: process.env,
            //
            arrayTitle: dataSourceDescription.title,
            array_source_key: source_pKey,
            team: team,
            brandColor: dataSourceDescription.brandColor,
            default_filterJSON: default_filterJSON,
            view_visibility: dataSourceDescription.fe_views ? dataSourceDescription.fe_views : {},
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
            fe_objectShow_customHTMLOverrideFnsByColumnName: dataSourceDescription.fe_objectShow_customHTMLOverrideFnsByColumnName || {},

            fe_galleryItem_htmlForIconFromRowObjWhenMissingImage: dataSourceDescription.fe_galleryItem_htmlForIconFromRowObjWhenMissingImage
        };
        callback(null, data);
    });
}

module.exports = constructor;