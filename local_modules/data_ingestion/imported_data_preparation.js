//
//
////////////////////////////////////////////////////////////////////////////////
// Imports
//
var dataSourceDescriptions = require('./MVP_datasource_descriptions').Descriptions;
//
//
////////////////////////////////////////////////////////////////////////////////
// Constants
//
var humanReadableColumnName_objectTitle = "Object Title";
module.exports.HumanReadableColumnName_objectTitle = humanReadableColumnName_objectTitle;
//
//
////////////////////////////////////////////////////////////////////////////////
// Accessors
//
function _dataSourcePKeyFromDataSourceDescription(dataSourceDescription, raw_source_documents_controller)
{
    var uid = dataSourceDescription.uid;
    var importRevision = dataSourceDescription.importRevision;
    var pKey = raw_source_documents_controller.NewCustomPrimaryKeyStringWithComponents(uid, importRevision);

    return pKey;
};
module.exports.DataSourcePKeyFromDataSourceDescription = _dataSourcePKeyFromDataSourceDescription;
//
function _dataSourceDescriptionWithPKey(source_pKey, raw_source_documents_controller)
{
    var dataSourceDescriptions_length = dataSourceDescriptions.length;
    for (var i = 0 ; i < dataSourceDescriptions_length ; i++) {
        var dataSourceDescription = dataSourceDescriptions[i];
        var dataSourceDescription_pKey = _dataSourcePKeyFromDataSourceDescription(dataSourceDescription, raw_source_documents_controller);
        if (dataSourceDescription_pKey === source_pKey) {
            return dataSourceDescription;
        }
    }
    
    return null;
};
module.exports.DataSourceDescriptionWithPKey = _dataSourceDescriptionWithPKey;
//
function _realColumnNameFromHumanReadableColumnName(humanReadableColumnName, dataSourceDescription)
{
    if (humanReadableColumnName === humanReadableColumnName_objectTitle) {
        return dataSourceDescription.fe_designatedFields.objectTitle;
    }
    var fe_filters_displayTitleOverride = dataSourceDescription.fe_filters_displayTitleOverride || {};
    var originalKeys = Object.keys(fe_filters_displayTitleOverride);
    var originalKeys_length = originalKeys.length;
    for (var i = 0 ; i < originalKeys_length ; i++) {
        var originalKey = originalKeys[i];
        var overrideTitle = fe_filters_displayTitleOverride[originalKey];
        if (overrideTitle === humanReadableColumnName) {
            return originalKey;
        }
    }
    
    return humanReadableColumnName;
};
module.exports.RealColumnNameFromHumanReadableColumnName = _realColumnNameFromHumanReadableColumnName;
//
function _rowParamKeysFromSampleRowObject_sansFEExcludedFields(sampleRowObject, dataSourceDescription)
{
    var rowParams = sampleRowObject.rowParams;
    var rowParams_keys = Object.keys(rowParams);
    var rowParams_keys_length = rowParams_keys.length;
    var feVisible_rowParams_keys = [];
    for (var i = 0 ; i < rowParams_keys_length ; i++) {
        var key = rowParams_keys[i];
        if (dataSourceDescription.fe_excludeFields) {
            if (dataSourceDescription.fe_excludeFields.indexOf(key) !== -1) {
                continue;
            }
        }
        feVisible_rowParams_keys.push(key);
    }
    
    return feVisible_rowParams_keys;
};
module.exports.RowParamKeysFromSampleRowObject_sansFEExcludedFields = _rowParamKeysFromSampleRowObject_sansFEExcludedFields;
//
function _rowParamKeysFromSampleRowObject_whichAreAvailableAsFilters(sampleRowObject, dataSourceDescription)
{
    var keys = _rowParamKeysFromSampleRowObject_sansFEExcludedFields(sampleRowObject, dataSourceDescription);
    var keys_length = keys.length;
    var filterAvailable_keys = [];
    for (var i = 0 ; i < keys_length ; i++) {
        var key = keys[i];
        if (dataSourceDescription.fe_fieldsNotAvailableAsFilters) {
            if (dataSourceDescription.fe_fieldsNotAvailableAsFilters.indexOf(key) !== -1) {
                continue;
            }
        }
        filterAvailable_keys.push(key);
    }
    
    return filterAvailable_keys;
};
module.exports.RowParamKeysFromSampleRowObject_whichAreAvailableAsFilters = _rowParamKeysFromSampleRowObject_whichAreAvailableAsFilters;
//
function _humanReadableFEVisibleColumnNamesWithSampleRowObject(sampleRowObject, dataSourceDescription)
{ // e.g. Replace designated object title with "Object Title"
    var rowParams_keys = _rowParamKeysFromSampleRowObject_sansFEExcludedFields(sampleRowObject, dataSourceDescription);
    var fe_filters_displayTitleOverride = dataSourceDescription.fe_filters_displayTitleOverride || {};
    // add in "Object Title" so we use the same machinery as the hand-specified ones
    fe_filters_displayTitleOverride["" + dataSourceDescription.fe_designatedFields.objectTitle] = humanReadableColumnName_objectTitle;
    //
    var originalKeys = Object.keys(fe_filters_displayTitleOverride);
    var originalKeys_length = originalKeys.length;
    for (var i = 0 ; i < originalKeys_length ; i++) {
        var originalKey = originalKeys[i];
        var displayTitleForKey = fe_filters_displayTitleOverride[originalKey];
        var indexOfOriginalKey = rowParams_keys.indexOf(originalKey);
        if (indexOfOriginalKey !== -1) {
            rowParams_keys[indexOfOriginalKey] = displayTitleForKey; // replace with display title
        }
    }
    
    
    return rowParams_keys;
};
module.exports.HumanReadableFEVisibleColumnNamesWithSampleRowObject = _humanReadableFEVisibleColumnNamesWithSampleRowObject;
//
function _humanReadableFEVisibleColumnNamesWithSampleRowObject_orderedForSortByDropdown(sampleRowObject, dataSourceDescription)
{
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