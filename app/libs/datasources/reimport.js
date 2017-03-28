var _ = require('lodash');

var datatypes = require('./datatypes')


var _mapColumnsOrErr = function(columns, samples, rowObjectsFromCoercionScheme, replacement, callback) {
    var newColumnsLength = columns.length;
    var oldColumnsLength = _.size(rowObjectsFromCoercionScheme);
    var isDifference = false;
    var difference = newColumnsLength - oldColumnsLength;

    var numberOfInconsistentColumns = 0;
    var rowObjects = [];
    for (var i = 0; i < columns.length; i++) {
        var columnName = columns[i].name;
        var sample = samples[i];
        // the columns in raw row objects coercion scheme is in the opposite order
        if (replacement) {
            if (!checkForContinutity(columnName, rowObjectsFromCoercionScheme)) {
                numberOfInconsistentColumns++;
            }
            
            if(numberOfInconsistentColumns > difference || oldColumnsLength > newColumnsLength) {
                return callback({message: "Datasources are not compatible"});
            }
        }
        var rowObject = datatypes.intuitDatatype(columnName, sample);
        rowObjects.push(rowObject);
    }
    if(numberOfInconsistentColumns == 0 && replacement) {
        // if there are no column inconsistencies, there's no need to do any reimporting
        callback(null, rowObjects, true)
    }
    // continuity = true;
    callback(null, rowObjects, false)
}
module.exports.mapColumnsOrErr = _mapColumnsOrErr

var checkForContinutity = function(name, rowObjects) {
    if (rowObjects.hasOwnProperty(name)) {
        return true;
    } else {
        return false;
    }
}
