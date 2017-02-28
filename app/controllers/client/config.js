var pageSize = 200;
var timelineGroupSize = 20;
var defaultDateFormat = 'MM/DD/YYYY';

var aggregateByDefaultColumnName = 'Number of Items';

var isDate = function (dataSourceDescription, columnName) {
    if (dataSourceDescription.raw_rowObjects_coercionScheme) {
        var coercion = dataSourceDescription.raw_rowObjects_coercionScheme;
        if (coercion[columnName] && coercion[columnName].operation == "ToDate") {
            console.log()
            return true;
        } else {
            // if there are any custom fields to process, recurse through them
            for (var i = 0; i < dataSourceDescription.customFieldsToProcess.length; i++) {
                var mergedFields = dataSourceDescription.customFieldsToProcess[i].fieldsToMergeIntoArray;
                var fieldName = dataSourceDescription.customFieldsToProcess[i].fieldName;
                if (fieldName === columnName) {
                    return isDate(dataSourceDescription, mergedFields[i]);
                }
            }
        }
    }
    return false;
}

module.exports = {
    pageSize: pageSize,
    timelineGroupSize: timelineGroupSize,
    defaultDateFormat: defaultDateFormat,
    aggregateByDefaultColumnName: aggregateByDefaultColumnName,
    isDate: isDate
};
