var raw_source_documents = require('../../models/raw_source_documents');
var _ = require('lodash');
var humanReadableColumnName_objectTitle = "Object Title";

module.exports.HumanReadableColumnName_objectTitle = humanReadableColumnName_objectTitle;

// function _dataSourcePKeyFromDataSourceDescription(dataSourceDescription,TeamSubdomain) {
//     var uid = dataSourceDescription.uid;
//     var importRevision = dataSourceDescription.importRevision;
    
//     var subdomain;
//     if (TeamSubdomain) {
//         subdomain = TeamSubdomain;
//     }

//     var pKey = raw_source_documents.NewCustomPrimaryKeyStringWithComponents(subdomain,uid, importRevision);

//     return pKey;
// };
// module.exports.DataSourcePKeyFromDataSourceDescription = _dataSourcePKeyFromDataSourceDescription;


var _dataSourceDescriptionWithPKey = function (source_pKey) {


    var split = source_pKey.split("-");
    if (split.length != 3) {
        return new Promise(function (resolve, reject) {
            reject();
        });
    }
    var subdomain = split[0];
    var uid = split[1];
    var revision = split[2].substring(1);

    return new Promise(function (resolve, reject) {
        var dataSourceDescriptions = require('../../models/descriptions');
        dataSourceDescriptions.GetDescriptionsWith_subdomain_uid_importRevision(subdomain,uid, revision, function (err, data) {
            if (err) reject(err);

            resolve(data);
        })
    })
};

module.exports.DataSourceDescriptionWithPKey = _dataSourceDescriptionWithPKey;


function _realColumnNameFromHumanReadableColumnName(humanReadableColumnName, dataSourceDescription) {


    if (humanReadableColumnName === humanReadableColumnName_objectTitle) {
        return dataSourceDescription.fe_designatedFields.objectTitle;
    }


    var fe_displayTitleOverrides = dataSourceDescription.fe_displayTitleOverrides || {};
    var originalKeys = Object.keys(fe_displayTitleOverrides);

    var originalKeys_length = originalKeys.length;
    for (var i = 0; i < originalKeys_length; i++) {
        var originalKey = originalKeys[i];
        var overrideTitle = fe_displayTitleOverrides[originalKey];
        if (overrideTitle === humanReadableColumnName) {
            return originalKey;
        }
    }

    return humanReadableColumnName;
};

module.exports.RealColumnNameFromHumanReadableColumnName = _realColumnNameFromHumanReadableColumnName;


function _rowParamKeysFromSampleRowObject_sansFEExcludedFields(sampleRowObject, dataSourceDescription) {
    var rowParams = sampleRowObject.rowParams;
    var rowParams_keys = Object.keys(rowParams);
    var rowParams_keys_length = rowParams_keys.length;
    var feVisible_rowParams_keys = [];
    for (var i = 0; i < rowParams_keys_length; i++) {
        var key = rowParams_keys[i];
        if (dataSourceDescription.fe_excludeFields && dataSourceDescription.fe_excludeFields[key]) {
            continue;
        }
        feVisible_rowParams_keys.push(key);
    }

    if (dataSourceDescription.imageScraping) {
        for (var i = 0; i < dataSourceDescription.imageScraping.length; i++) {
           for (var j = 0; j < dataSourceDescription.imageScraping[i].setFields.length; j++) {
                var index = feVisible_rowParams_keys.indexOf(dataSourceDescription.imageScraping[i].setFields[j].newFieldName)
                if (index >= 0) {
                     feVisible_rowParams_keys.splice(index,1);
                }
            }
        }
    }

    return feVisible_rowParams_keys;
};

module.exports.RowParamKeysFromSampleRowObject_sansFEExcludedFields = _rowParamKeysFromSampleRowObject_sansFEExcludedFields;


function _humanReadableFEVisibleColumnNamesWithSampleRowObject(sampleRowObject, dataSourceDescription) { // e.g. Replace designated object title with "Object Title"
    var rowParams_keys = _rowParamKeysFromSampleRowObject_sansFEExcludedFields(sampleRowObject, dataSourceDescription);
    var fe_displayTitleOverrides = dataSourceDescription.fe_displayTitleOverrides || {};
    // add in "Object Title" so we use the same machinery as the hand-specified ones
    fe_displayTitleOverrides["" + dataSourceDescription.fe_designatedFields.objectTitle] = humanReadableColumnName_objectTitle;
    //
    var originalKeys = Object.keys(fe_displayTitleOverrides);
    var originalKeys_length = originalKeys.length;
    for (var i = 0; i < originalKeys_length; i++) {
        var originalKey = originalKeys[i];
        var displayTitleForKey = fe_displayTitleOverrides[originalKey];
        var indexOfOriginalKey = rowParams_keys.indexOf(originalKey);
        if (indexOfOriginalKey !== -1) {
            rowParams_keys[indexOfOriginalKey] = displayTitleForKey; // replace with display title
        }
    }

    // First sort alphabetically
    rowParams_keys.sort();

    // Then sort by custom order if defined
    var fe_fieldDisplayOrder = dataSourceDescription.fe_fieldDisplayOrder;
    if (fe_fieldDisplayOrder) {
        var rowParams_keys_customSorted = [];
        for (i = 0; i < fe_fieldDisplayOrder.length; i++) {
            var index = rowParams_keys.indexOf(fe_fieldDisplayOrder[i]);
            if (index > -1) {
                reorder(index, rowParams_keys, fe_fieldDisplayOrder[i])
            } else {
                //the list is now made up of original keys and displayTitles so we have to check both
                var displayTitle = fe_displayTitleOverrides[fe_fieldDisplayOrder[i]];
                index = rowParams_keys.indexOf(displayTitle)
                if (index > -1) {
                    reorder(index, rowParams_keys, displayTitle)
                }
            }
        }

        rowParams_keys = rowParams_keys_customSorted.concat(rowParams_keys);
    }

    function reorder (index, rowParams_keys, displayOrderKey) {
        rowParams_keys.splice(index, 1);
        rowParams_keys_customSorted.push(displayOrderKey);
    }

    return rowParams_keys;
}

module.exports.HumanReadableFEVisibleColumnNamesWithSampleRowObject = _humanReadableFEVisibleColumnNamesWithSampleRowObject;

//
function _humanReadableFEVisibleColumnNamesWithSampleRowObject_orderedForSortByDropdown(sampleRowObject, dataSourceDescription) {
    var columnNames = _humanReadableFEVisibleColumnNamesWithSampleRowObject(sampleRowObject, dataSourceDescription);
    columnNames = columnNames.sort(); // alpha sort
    // Move "Object Title" to idx 0
    var indexOf_objectTitle = columnNames.indexOf(humanReadableColumnName_objectTitle); // we presume this is not -1
    columnNames.splice(indexOf_objectTitle, 1);
    columnNames.unshift(humanReadableColumnName_objectTitle);

    return columnNames;
};

module.exports.HumanReadableFEVisibleColumnNamesWithSampleRowObject_orderedForSortByDropdown = _humanReadableFEVisibleColumnNamesWithSampleRowObject_orderedForSortByDropdown;

//
function _humanReadableFEVisibleColumnNamesWithSampleRowObject_orderedForDropdown(sampleRowObject, dataSourceDescription, viewType, fieldName, restrictFieldType) {


    var fe_displayTitleOverrides = dataSourceDescription.fe_displayTitleOverrides || {};
    // add in "Object Title" so we use the same machinery as the hand-specified ones
    fe_displayTitleOverrides["" + dataSourceDescription.fe_designatedFields.objectTitle] = humanReadableColumnName_objectTitle;
    //
    var keys = _rowParamKeysFromSampleRowObject_sansFEExcludedFields(sampleRowObject, dataSourceDescription);
    var available_keys = [];
    var field = 'fieldsNotAvailable';
    if (fieldName) field += ('As' + fieldName + 'Columns');
    _.each(keys, function (key) {
        if (dataSourceDescription.fe_views.views[viewType][field]) {
            if (dataSourceDescription.fe_views.views[viewType][field].indexOf(key) !== -1) {
                return;
            }
        }
        if (restrictFieldType != null) {
            if (!dataSourceDescription.raw_rowObjects_coercionScheme[key] ||
                dataSourceDescription.raw_rowObjects_coercionScheme[key].operation != restrictFieldType) {
                return;
            }

        }
        var displayTitleForKey = fe_displayTitleOverrides[key];
        var humanReadable_key = displayTitleForKey || key;
        available_keys.push(humanReadable_key);
    });

    return available_keys;
}

module.exports.HumanReadableFEVisibleColumnNamesWithSampleRowObject_orderedForDropdown = _humanReadableFEVisibleColumnNamesWithSampleRowObject_orderedForDropdown;

function _dataSourceUIDFromTitle(title) {
    if (!title) return new Error('Title is not provided!');

    return title.toLowerCase().replace(/[^A-Z0-9]+/ig, "_");
}
module.exports.DataSourceUIDFromTitle = _dataSourceUIDFromTitle