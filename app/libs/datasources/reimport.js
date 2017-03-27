var datatypes = require('./datatypes')

var _mapColumnsOrErr = function(columns, samples, rowObjectsFromCoercionScheme, difference, isDifference, replacement, callback) {
    var numberOfInconsistentColumns = 0;
    var numberOfChangedColumnNames = 0;
    var rowObjects = [];

    for (var i = 0; i < columns.length; i++) {
        var columnName = columns[i].name;
        var sample = samples[i];
        // the columns in raw row objects coercion scheme is in the opposite order
        if (replacement) {
            var oldColumnsKeys = Object.keys(rowObjectsFromCoercionScheme);
            if (i > oldColumnsKeys.length - 1) {
                numberOfInconsistentColumns++;
            } else {
                var oldColumnsIndex = oldColumnsKeys.length - 1 - i;
                var oldColumnName = oldColumnsKeys[oldColumnsIndex];
                if (!checkForContinutity(columnName, rowObjectsFromCoercionScheme)) {
                    // if the column names are different but the data types are still the same, it might be okay - can check against the column data type at the same index in req.session.columns
                    // it won't work, though, if they've removed a column that will offset the index and change the name
                    if (rowObjectsFromCoercionScheme[oldColumnName] && datatypes.intuitDatatype(columnName, sample).operation == rowObjectsFromCoercionScheme[oldColumnName].operation) {
                        numberOfChangedColumnNames++;
                    } else {
                        numberOfInconsistentColumns++;
                    }
                }
            }

            if(numberOfInconsistentColumns > difference && isDifference) {
                return callback({message: "Datasources are not compatible"});
            }
            if(numberOfInconsistentColumns >= difference && !isDifference) {
                return callback({message: "Datasources are not compatible"});
            }

        }
        var rowObject = datatypes.intuitDatatype(columnName, sample);
        rowObjects.push(rowObject);
    }
    if(numberOfInconsistentColumns == 0 && numberOfChangedColumnNames == 0 && replacement) {
        // if there are no column inconsistencies, there's no need to do any reimporting
        callback(null, rowObjects, true)
    }
    // continuity = true;
    callback(null, rowObjects, false)
}
module.exports.mapColumnsOrErr = _mapColumnsOrErr

var checkForContinutity = function(name, excludeFieldsObject) {
    if (excludeFieldsObject.hasOwnProperty(name)) {
        return true;
    } else {
        return false;
    }
}

var _checkAgainstExistingFEExcludeFields = function(columns, fe_excludeFields) {
    // if columns length is greater than exclude length
    var fe_excludeFieldsKeys = Object.keys(fe_excludeFields);
    for(var i = fe_excludeFieldsKeys.length - 1; i >= 0; i--) {
        var columnsIndex = fe_excludeFieldsKeys.length - 1 - i;
        var key = fe_excludeFieldsKeys[i];
        console.log(key)
        console.log(columns[columnsIndex].name)
        fe_excludeFields[columns[columnsIndex].name] = fe_excludeFields[key];
        delete fe_excludeFields[key];
    }
    return fe_excludeFields

}