var raw_source_documents = require('../../models/raw_source_documents');
var dataSourceDescriptions = require('../descriptions');
// var teamDescriptions = require('../teams').GetTeams();

var humanReadableColumnName_objectTitle = "Object Title";

module.exports.HumanReadableColumnName_objectTitle = humanReadableColumnName_objectTitle;

function _dataSourcePKeyFromDataSourceDescription(dataSourceDescription) {
    var uid = dataSourceDescription.uid;
    var importRevision = dataSourceDescription.importRevision;
    var pKey = raw_source_documents.NewCustomPrimaryKeyStringWithComponents(uid, importRevision);

    return pKey;
};
module.exports.DataSourcePKeyFromDataSourceDescription = _dataSourcePKeyFromDataSourceDescription;

//

var _dataSourceDescriptionWithPKey = function(source_pKey) {

    var split = source_pKey.split("-");
    var uid = split[0];
    var revision = split[1].substring(1);
    return new Promise(function(resolve,reject) {
         dataSourceDescriptions.GetDescriptionsWith_uid_importRevision(uid,revision,function(data) {
           resolve(data);

        },function(err) {
            reject(err);
        })

    })
}





module.exports.DataSourceDescriptionWithPKey = _dataSourceDescriptionWithPKey;

//
// function _teamDescription(team_key) {
//     var teamDescriptions_length = teamDescriptions.length;
//     for (var i = 0; i < teamDescriptions_length; i++) {
//         var teamDescription = teamDescriptions[i];
//         if (teamDescription.id === team_key) {
//             return teamDescription;
//         }
//     }

//     return null;
// }
// module.exports.TeamDescription = _teamDescription;

//
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

//
function _rowParamKeysFromSampleRowObject_sansFEExcludedFields(sampleRowObject, dataSourceDescription) {
    var rowParams = sampleRowObject.rowParams;
    var rowParams_keys = Object.keys(rowParams);
    var rowParams_keys_length = rowParams_keys.length;
    var feVisible_rowParams_keys = [];
    for (var i = 0; i < rowParams_keys_length; i++) {
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
function _rowParamKeysFromSampleRowObject_whichAreAvailableAsFilters(sampleRowObject, dataSourceDescription) {
    var keys = _rowParamKeysFromSampleRowObject_sansFEExcludedFields(sampleRowObject, dataSourceDescription);
    var keys_length = keys.length;
    var filterAvailable_keys = [];
    for (var i = 0; i < keys_length; i++) {
        var key = keys[i];
        if (dataSourceDescription.fe_filters.fieldsNotAvailable) {
            if (dataSourceDescription.fe_filters.fieldsNotAvailable.indexOf(key) !== -1) {
                continue;
            }
        }
        filterAvailable_keys.push(key);
    }

    return filterAvailable_keys;
};
module.exports.RowParamKeysFromSampleRowObject_whichAreAvailableAsFilters = _rowParamKeysFromSampleRowObject_whichAreAvailableAsFilters;

//
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
                rowParams_keys.splice(index, 1);
                rowParams_keys_customSorted.push(fe_fieldDisplayOrder[i]);
            }
        }

        rowParams_keys = rowParams_keys_customSorted.concat(rowParams_keys);
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
function _humanReadableFEVisibleColumnNamesWithSampleRowObject_orderedForTimelineSortByDropdown(sampleRowObject, dataSourceDescription) {
    var fe_displayTitleOverrides = dataSourceDescription.fe_displayTitleOverrides || {};
    // add in "Object Title" so we use the same machinery as the hand-specified ones
    fe_displayTitleOverrides["" + dataSourceDescription.fe_designatedFields.objectTitle] = humanReadableColumnName_objectTitle;
    //
    var keys = _rowParamKeysFromSampleRowObject_sansFEExcludedFields(sampleRowObject, dataSourceDescription);
    var keys_length = keys.length;
    var available_keys = [];
    for (var i = 0; i < keys_length; i++) {
        var key = keys[i];
        if (dataSourceDescription.fe_views.views.timeline.fieldsNotAvailableAsSortByColumns) {
            if (dataSourceDescription.fe_views.views.timeline.fieldsNotAvailableAsSortByColumns.indexOf(key) !== -1) {
                continue;
            }
        }
        var displayTitleForKey = fe_displayTitleOverrides[key];
        var humanReadable_key = displayTitleForKey || key;
        available_keys.push(humanReadable_key);
    }

    return available_keys;
}
module.exports.HumanReadableFEVisibleColumnNamesWithSampleRowObject_orderedForTimelineSortByDropdown = _humanReadableFEVisibleColumnNamesWithSampleRowObject_orderedForTimelineSortByDropdown;

//
function _humanReadableFEVisibleColumnNamesWithSampleRowObject_orderedForChartGroupByDropdown(sampleRowObject, dataSourceDescription) {
    var fe_displayTitleOverrides = dataSourceDescription.fe_displayTitleOverrides || {};
    // add in "Object Title" so we use the same machinery as the hand-specified ones
    fe_displayTitleOverrides["" + dataSourceDescription.fe_designatedFields.objectTitle] = humanReadableColumnName_objectTitle;
    //
    var keys = _rowParamKeysFromSampleRowObject_sansFEExcludedFields(sampleRowObject, dataSourceDescription);
    var keys_length = keys.length;
    var available_keys = [];
    for (var i = 0; i < keys_length; i++) {
        var key = keys[i];
        if (dataSourceDescription.fe_views.views.chart.fieldsNotAvailableAsGroupByColumns) {
            if (dataSourceDescription.fe_views.views.chart.fieldsNotAvailableAsGroupByColumns.indexOf(key) !== -1) {
                continue;
            }
        }
        var displayTitleForKey = fe_displayTitleOverrides[key];
        var humanReadable_key = displayTitleForKey || key;
        available_keys.push(humanReadable_key);
    }

    return available_keys;
}
module.exports.HumanReadableFEVisibleColumnNamesWithSampleRowObject_orderedForChartGroupByDropdown = _humanReadableFEVisibleColumnNamesWithSampleRowObject_orderedForChartGroupByDropdown;

//
function _humanReadableFEVisibleColumnNamesWithSampleRowObject_orderedForChoroplethMapByDropdown(sampleRowObject, dataSourceDescription) {
    var fe_displayTitleOverrides = dataSourceDescription.fe_displayTitleOverrides || {};
    // add in "Object Title" so we use the same machinery as the hand-specified ones
    fe_displayTitleOverrides["" + dataSourceDescription.fe_designatedFields.objectTitle] = humanReadableColumnName_objectTitle;
    //
    var keys = _rowParamKeysFromSampleRowObject_sansFEExcludedFields(sampleRowObject, dataSourceDescription);
    var keys_length = keys.length;
    var available_keys = [];
    for (var i = 0; i < keys_length; i++) {
        var key = keys[i];
        if (dataSourceDescription.fe_views.views.choropleth.fieldsNotAvailableAsMapByColumns) {
            if (dataSourceDescription.fe_views.views.choropleth.fieldsNotAvailableAsMapByColumns.indexOf(key) !== -1) {
                continue;
            }
        }
        var displayTitleForKey = fe_displayTitleOverrides[key];
        var humanReadable_key = displayTitleForKey || key;
        available_keys.push(humanReadable_key);
    }

    return available_keys;
}
module.exports.HumanReadableFEVisibleColumnNamesWithSampleRowObject_orderedForChoroplethMapByDropdown = _humanReadableFEVisibleColumnNamesWithSampleRowObject_orderedForChoroplethMapByDropdown;

//
function _humanReadableFEVisibleColumnNamesWithSampleRowObject_orderedForScatterplotAxisDropdown(sampleRowObject, dataSourceDescription) {
    var fe_displayTitleOverrides = dataSourceDescription.fe_displayTitleOverrides || {};
    // add in "Object Title" so we use the same machinery as the hand-specified ones
    fe_displayTitleOverrides["" + dataSourceDescription.fe_designatedFields.objectTitle] = humanReadableColumnName_objectTitle;
    //
    var keys = _rowParamKeysFromSampleRowObject_sansFEExcludedFields(sampleRowObject, dataSourceDescription);
    var keys_length = keys.length;
    var available_keys = [];
    for (var i = 0; i < keys_length; i++) {
        var key = keys[i];
        if (dataSourceDescription.fe_views.views.scatterplot.fieldsNotAvailable) {
            if (dataSourceDescription.fe_views.views.scatterplot.fieldsNotAvailable.indexOf(key) !== -1) {
                continue;
            }
        }
        var displayTitleForKey = fe_displayTitleOverrides[key];
        var humanReadable_key = displayTitleForKey || key;
        available_keys.push(humanReadable_key);
    }

    return available_keys;
}
module.exports.HumanReadableFEVisibleColumnNamesWithSampleRowObject_orderedForScatterplotAxisDropdown = _humanReadableFEVisibleColumnNamesWithSampleRowObject_orderedForScatterplotAxisDropdown;

//
function _humanReadableFEVisibleColumnNamesWithSampleRowObject_orderedForwordCloudGroupByDropdown(sampleRowObject, dataSourceDescription) {
    var fe_displayTitleOverrides = dataSourceDescription.fe_displayTitleOverrides || {};
    // add in "Object Title" so we use the same machinery as the hand-specified ones
    fe_displayTitleOverrides["" + dataSourceDescription.fe_designatedFields.objectTitle] = humanReadableColumnName_objectTitle;
    //
    var keys = _rowParamKeysFromSampleRowObject_sansFEExcludedFields(sampleRowObject, dataSourceDescription);
    var keys_length = keys.length;
    var available_keys = [];
    for (var i = 0; i < keys_length; i++) {
        var key = keys[i];
        if (dataSourceDescription.fe_views.views.wordCloud.fieldsNotAvailableAsGroupByColumns) {
            if (dataSourceDescription.fe_views.views.wordCloud.fieldsNotAvailableAsGroupByColumns.indexOf(key) !== -1) {
                continue;
            }
        }
        var displayTitleForKey = fe_displayTitleOverrides[key];
        var humanReadable_key = displayTitleForKey || key;
        available_keys.push(humanReadable_key);
    }

    return available_keys;
}
module.exports.HumanReadableFEVisibleColumnNamesWithSampleRowObject_orderedForwordCloudGroupByDropdown = _humanReadableFEVisibleColumnNamesWithSampleRowObject_orderedForwordCloudGroupByDropdown;

//
function _humanReadableFEVisibleColumnNamesWithSampleRowObject_orderedForLineGraphGroupByDropdown(sampleRowObject, dataSourceDescription) {
    var fe_displayTitleOverrides = dataSourceDescription.fe_displayTitleOverrides || {};
    // add in "Object Title" so we use the same machinery as the hand-specified ones
    fe_displayTitleOverrides["" + dataSourceDescription.fe_designatedFields.objectTitle] = humanReadableColumnName_objectTitle;
    //
    var keys = _rowParamKeysFromSampleRowObject_sansFEExcludedFields(sampleRowObject, dataSourceDescription);
    var keys_length = keys.length;
    var available_keys = [];
    for (var i = 0; i < keys_length; i++) {
        var key = keys[i];
        if (dataSourceDescription.fe_views.views.lineGraph.fieldsNotAvailableAsGroupByColumns) {
            if (dataSourceDescription.fe_views.views.lineGraph.fieldsNotAvailableAsGroupByColumns.indexOf(key) !== -1) {
                continue;
            }
        }
        var displayTitleForKey = fe_displayTitleOverrides[key];
        var humanReadable_key = displayTitleForKey || key;
        available_keys.push(humanReadable_key);
    }

    return available_keys;
}
module.exports.HumanReadableFEVisibleColumnNamesWithSampleRowObject_orderedForLineGraphGroupByDropdown = _humanReadableFEVisibleColumnNamesWithSampleRowObject_orderedForLineGraphGroupByDropdown;