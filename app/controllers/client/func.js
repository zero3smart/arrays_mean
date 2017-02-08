var winston = require('winston');
var moment = require('moment');
var _ = require('lodash');

var importedDataPreparation = require('../../libs/datasources/imported_data_preparation');
var cached_values = require('../../models/cached_values');
var datatypes = require('../../libs/datasources/datatypes');
var config = require('./config.js');


//


var _findItemInArrayOfObject = function(ArrayOfObj,targetKey) {

    if (typeof ArrayOfObj != 'undefined' && Array.isArray(ArrayOfObj)) {
        for (var i = 0; i < ArrayOfObj.length; i++) {
            var currentKey = ArrayOfObj[i].key;
            if (currentKey == targetKey) {
                return ArrayOfObj[i];
            }
        }

    }
  
    return null;
}

module.exports.findItemInArrayOfObject = _findItemInArrayOfObject;


var _convertArrayObjectToObject = function(ArrayOfObj) {
    var obj = {};
    if (typeof ArrayOfObj != 'undefined' && Array.isArray(ArrayOfObj)) {
        for (var i = 0 ; i< ArrayOfObj.length; i++) {
            var key = ArrayOfObj[i].key;
            obj[key] = ArrayOfObj[i].value;
        }
    }
    return obj;
}

module.exports.convertArrayObjectToObject = _convertArrayObjectToObject;



var _routePathByAppendingQueryStringToVariationOfBase = function (routePath_variation, queryString, routePath_base) {
    if (routePath_variation === routePath_base) {
        routePath_variation += "?";
    } else {
        routePath_variation += "&";
    }
    routePath_variation += queryString;

    return routePath_variation;
};
//
var _urlQueryByAppendingQueryStringToExistingQueryString = function (existingQueryString, queryStringToAppend) {
    var newWholeQueryString = existingQueryString;
    if (existingQueryString.length == 0) {
        newWholeQueryString += "?";
    } else {
        newWholeQueryString += "&";
    }
    newWholeQueryString += queryStringToAppend;

    return newWholeQueryString;
};
module.exports.urlQueryByAppendingQueryStringToExistingQueryString = _urlQueryByAppendingQueryStringToExistingQueryString;

//
var _activeFilter_matchOp_orErrDescription_fromMultiFilter = function (dataSourceDescription, filterObj) {
    var filterCols = Object.keys(filterObj);
    var filterCols_length = filterCols.length;
    if (filterCols_length == 0) {
        return {err: new Error("No active filter despite filterObj")};
    }
    var conditions = [];
    for (var i = 0; i < filterCols_length; i++) {
        var filterCol = filterCols[i];
        var filterVals = filterObj[filterCol];
        if (!Array.isArray(filterVals)) {
            filterVals = [filterVals];
        }
        var filterVals_length = filterVals.length;
        for (var j = 0; j < filterVals_length; j++) {
            var filterVal = filterVals[j];
            var matchConditions = {};
            try {
                filterVal = JSON.parse(filterVal);
            } catch (e) {
                // Restore
                filterVal = filterVals[j];
            }


            
            if (typeof filterVal === 'string' || typeof filterVal === 'number') {

                matchConditions = _activeFilter_matchCondition_orErrDescription(dataSourceDescription, filterCol, filterVal);
            } else if (filterVal.min != undefined || filterVal.max != undefined) {
                matchConditions = _activeFilterRange_matchCondition_orErrDescription(dataSourceDescription, filterCol, filterVal.min, filterVal.max);
            } else if (Array.isArray(filterVal)) {
                matchConditions = _activeFilterOR_matchCondition_orErrDescription(dataSourceDescription, filterCol, filterVal);
            } else {
                // TODO - ERROR - Unexpected format
            }
            if (typeof matchConditions.err !== 'undefined') {
                return {err: matchConditions.err};
            }
            conditions = conditions.concat(matchConditions.matchConditions);
        }
    }
    if (conditions.length == 0) {
        winston.error("❌  Programmer runtime check error. No match conditions in multifilter for filter obj: ", filterObj);
        return {err: new Error("No match conditions in multifilter despite filterObj")};
    }

    return {matchOps: conditions};
};
module.exports.activeFilter_matchOp_orErrDescription_fromMultiFilter = _activeFilter_matchOp_orErrDescription_fromMultiFilter;

//


var _activeFilter_matchCondition_orErrDescription = function (dataSourceDescription, filterCol, filterVal) {
    var matchConditions = undefined;
    var isAFabricatedFilter = false; // finalize
    if (dataSourceDescription.fe_filters.fabricated) {
        var fabricatedFilters_length = dataSourceDescription.fe_filters.fabricated.length;
        for (var i = 0; i < fabricatedFilters_length; i++) {
            var fabricatedFilter = dataSourceDescription.fe_filters.fabricated[i];
            if (fabricatedFilter.title === filterCol) {
                isAFabricatedFilter = true;
                // Now find the applicable filter choice
                var choices = fabricatedFilter.choices;
                var choices_length = choices.length;
                var foundChoice = false;
                for (var j = 0; j < choices_length; j++) {
                    var choice = choices[j];
                    if (choice.title === filterVal) {
                        foundChoice = true;

                        var reformQuery = {};

                        var nin = [];

                        // catching user input for null and empty string

                        choice["match"].nin.map(function(ninField) {
                            if (ninField == 'null') {
                                nin.push(null);
                            } else if (ninField == '""') {
                                nin.push("");
                            } else {
                                nin.push(ninField);
                            }
                        })



                        reformQuery[choice["match"].field] = {
                            $exists: choice["match"].exist,
                            $nin: nin
                        }


                        // console.log(nin);

                        matchConditions = [{$match: reformQuery}];


                        break; // found the applicable filter choice
                    }
                }
                if (foundChoice == false) { // still not found despite the filter col being recognized as fabricated
                    return {err: new Error("No such choice \"" + filterVal + "\" for filter " + filterCol)};
                }

                break; // found the applicable fabricated filter
            }
        }
    }

    if (isAFabricatedFilter == true) { // already obtained matchConditions just above
        if (typeof matchConditions === 'undefined') {
            return {err: new Error("Unexpectedly missing matchConditions given fabricated filter…" + JSON.stringify(urlQuery))};
        }
    } else {
        var realColumnName = importedDataPreparation.RealColumnNameFromHumanReadableColumnName(filterCol, dataSourceDescription);
        var realColumnName_path = "rowParams." + realColumnName;
        var realFilterValue = filterVal; // To finalize in case of override…
        // To coercion the date field into the valid date
        var raw_rowObjects_coercionSchema = dataSourceDescription.raw_rowObjects_coercionScheme;
        var isDate = raw_rowObjects_coercionSchema && raw_rowObjects_coercionSchema[realColumnName]
            && raw_rowObjects_coercionSchema[realColumnName].operation === "ToDate";

      
        if (!isDate) {
            var oneToOneOverrideWithValuesByTitleByFieldName = dataSourceDescription.fe_filters.oneToOneOverrideWithValuesByTitleByFieldName || {};
    

            var oneToOneOverrideWithValuesByTitle_forThisColumn = oneToOneOverrideWithValuesByTitleByFieldName[realColumnName];
      
            if (oneToOneOverrideWithValuesByTitle_forThisColumn) {

                var valueByOverride = oneToOneOverrideWithValuesByTitle_forThisColumn.find(function(singleValue) {
                    return singleValue.override == filterVal;
                });
                if (typeof valueByOverride === 'undefined') {
                    var errString = "Missing override value for overridden column " + realColumnName + " and incoming filterVal " + filterVal;
                    winston.error("❌  " + errString); // we'll just use the value they entered - maybe a user is manually editing the URL
                } else {
                    realFilterValue = valueByOverride.value;
                }
            }
            if (typeof realFilterValue === 'string') {
                // We need to consider that the search column might be array
                // escape Mongo reserved characters in Mongo
                realFilterValue = realFilterValue.split("(").join("\\(")
                    .split(")").join("\\)")
                    .split("+").join("\\+")
                    .split("$").join("\\$");
            } else {
                realFilterValue = '' + realFilterValue;
            }

            matchConditions = _activeSearch_matchOp_orErrDescription(dataSourceDescription, realColumnName, realFilterValue).matchOps;

        } else {
            matchConditions = _activeSearch_matchOp_orErrDescription(dataSourceDescription, realColumnName, filterVal).matchOps;
        }
    }
    if (typeof matchConditions === 'undefined') {
        throw new Error("Undefined match condition");
    }

    return {matchConditions: matchConditions};
};
module.exports.activeFilter_matchCondition_orErrDescription = _activeFilter_matchCondition_orErrDescription;

//
var _activeFilterRange_matchCondition_orErrDescription = function (dataSourceDescription, filterCol, filterValMin, filterValMax) {
    var realColumnName = importedDataPreparation.RealColumnNameFromHumanReadableColumnName(filterCol, dataSourceDescription);
    var realColumnName_path = "rowParams." + realColumnName;
    var realFilterValueMin = filterValMin, realFilterValueMax = filterValMax; // To finalize in case of override…
    // To coercion the date field into the valid date
    var raw_rowObjects_coercionSchema = dataSourceDescription.raw_rowObjects_coercionScheme;
    var isDate = raw_rowObjects_coercionSchema && raw_rowObjects_coercionSchema[realColumnName]
        && raw_rowObjects_coercionSchema[realColumnName].operation === "ToDate";
    if (!isDate) {
        var oneToOneOverrideWithValuesByTitleByFieldName = dataSourceDescription.fe_filters.oneToOneOverrideWithValuesByTitleByFieldName || {};
        var oneToOneOverrideWithValuesByTitle_forThisColumn = oneToOneOverrideWithValuesByTitleByFieldName[realColumnName];
        if (oneToOneOverrideWithValuesByTitle_forThisColumn) {
            var valueByOverrideMin = oneToOneOverrideWithValuesByTitle_forThisColumn.find(function(valueByOverride) {
                return valueByOverride.override = filterValMin;
            });

            if (typeof valueByOverrideMin === 'undefined') {
                var errString = "Missing override value for overridden column " + realColumnName + " and incoming filterValMin " + filterValMin;
                winston.error("❌  " + errString); // we'll just use the value they entered - maybe a user is manually editing the URL
                throw new Error("Undefined match condition");
            } else {
                realFilterValueMin = valueByOverrideMin.value;
            }

            var valueByOverrideMax = oneToOneOverrideWithValuesByTitle_forThisColumn.find(function(valueByOverride) {
                return valueByOverride.override = filterValMax;
            });

            if (typeof valueByOverrideMax === 'undefined') {
                var errString = "Missing override value for overridden column " + realColumnName + " and incoming filterValMax " + filterValMax;
                winston.error("❌  " + errString); // we'll just use the value they entered - maybe a user is manually editing the URL
                throw new Error("Undefined match condition");
            } else {
                realFilterValueMax = valueByOverrideMax.value;
            }
        }
    } else {
        var filterDateMin = moment.utc(filterValMin);
        if (filterDateMin.isValid()) {
            realFilterValueMin = filterDateMin.startOf('day').toDate();
        } else {
            throw new Error('Invalid date');
        }
        var filterDateMax = moment.utc(filterValMax);
        if (filterDateMax.isValid()) {
            realFilterValueMax = filterDateMax.startOf('day').toDate();
        } else {
            throw new Error('Invalid date');
        }
    }

    // We need to consider that the search column is array
    var projectOp = {
        $project: {
            _id: 1,
            pKey: 1,
            srcDocPKey: 1,
            rowParams: 1,
            matchingField: {
                $cond: {
                    if: {$isArray: "$" + realColumnName_path},
                    then: {$size: "$" + realColumnName_path}, // gets the number of items in the array
                    else: "$" + realColumnName_path
                }
            }
        }
    };

    var matchOp = {$match: {}};
    matchOp["$match"]["matchingField"] = {$gte: realFilterValueMin, $lt: realFilterValueMax};

    return {matchConditions: [projectOp, matchOp]};
};
module.exports.activeFilterRange_matchCondition_orErrDescription = _activeFilterRange_matchCondition_orErrDescription;

//
var _activeFilterOR_matchCondition_orErrDescription = function (dataSourceDescription, filterCol, filterVal) {
    var matchConditions = undefined;
    var isAFabricatedFilter = false; // finalize
    if (dataSourceDescription.fe_filters.fabricated) {
        var fabricatedFilters_length = dataSourceDescription.fe_filters.fabricated.length;
        for (var i = 0; i < fabricatedFilters_length; i++) {
            var fabricatedFilter = dataSourceDescription.fe_filters.fabricated[i];
            if (fabricatedFilter.title === filterCol) {
                isAFabricatedFilter = true;
                // Now find the applicable filter choice
                var choices = fabricatedFilter.choices;
                var choices_length = choices.length;

                for (var k = 0; k < filterVal.length; k++) {

                    var foundChoice = false;
                    for (var j = 0; j < choices_length; j++) {
                        var choice = choices[j];
                        if (choice.title === filterVal[k]) {
                            foundChoice = true;

                            var reformQuery = {};

                            reformQuery[choice["match"].field] = {
                                $exists: choice["match"].exist,
                                $nin: choice["match"].nin
                            }

                            matchConditions = [{$match: reformQuery}];




                            break; // found the applicable filter choice
                        }
                    }
                    if (foundChoice == false) { // still not found despite the filter col being recognized as fabricated
                        return {err: new Error("No such choice \"" + filterVal + "\" for filter " + filterCol)};
                    }

                }

                break; // found the applicable fabricated filter
            }
        }
    }

    if (isAFabricatedFilter == true) { // already obtained matchConditions just above
        if (typeof matchConditions === 'undefined') {
            return {err: new Error("Unexpectedly missing matchConditions given fabricated filter…" + JSON.stringify(urlQuery))};
        }
    } else {
        var realColumnName = importedDataPreparation.RealColumnNameFromHumanReadableColumnName(filterCol, dataSourceDescription);
        var realColumnName_path = "rowParams." + realColumnName;

        // To coercion the date field into the valid date
        var raw_rowObjects_coercionSchema = dataSourceDescription.raw_rowObjects_coercionScheme;
        var isDate = raw_rowObjects_coercionSchema && raw_rowObjects_coercionSchema[realColumnName]
            && raw_rowObjects_coercionSchema[realColumnName].operation === "ToDate";

        if (!isDate) {
            for (var i = 0; i < filterVal.length; i++) {
                var realFilterValue = filterVal[i]; // To finalize in case of override…
                var oneToOneOverrideWithValuesByTitleByFieldName = dataSourceDescription.fe_filters.oneToOneOverrideWithValuesByTitleByFieldName || {};
                var oneToOneOverrideWithValuesByTitle_forThisColumn = oneToOneOverrideWithValuesByTitleByFieldName[realColumnName];
                if (oneToOneOverrideWithValuesByTitle_forThisColumn) {
                    var valueByOverride = oneToOneOverrideWithValuesByTitle_forThisColumn.find(function(valueByOverride) {
                        return valueByOverride.override = realFilterValue;
                    });

                    if (typeof valueByOverride === 'undefined') {
                        var errString = "Missing override value for overridden column " + realColumnName + " and incoming filterVal " + filterVal;
                        winston.error("❌  " + errString); // we'll just use the value they entered - maybe a user is manually editing the URL
                    } else {
                        realFilterValue = valueByOverride.value;
                    }
                }
                if (typeof realFilterValue === 'string') {
                    // We need to consider that the search column might be array
                    // escape Mongo reserved characters in Mongo
                    realFilterValue = realFilterValue.split("(").join("\\(")
                        .split(")").join("\\)")
                        .split("+").join("\\+")
                        .split("$").join("\\$");
                } else {
                    realFilterValue = '' + realFilterValue;
                }
                filterVal[i] = realFilterValue;
            }
        }

        matchConditions = _activeSearch_matchOp_orErrDescription(dataSourceDescription, realColumnName, filterVal).matchOps;
    }

    if (typeof matchConditions === 'undefined') {
        throw new Error("Undefined match condition");
    }

    return {matchConditions: matchConditions};
};
module.exports.activeFilterOR_matchCondition_orErrDescription = _activeFilterOR_matchCondition_orErrDescription;

// returns dictionary with err or matchOp
var _activeSearch_matchOp_orErrDescription = function (dataSourceDescription, searchCol, searchQ) {
    var realColumnName = importedDataPreparation.RealColumnNameFromHumanReadableColumnName(searchCol, dataSourceDescription);
    var realColumnName_path = "rowParams." + realColumnName;

    // We need to consider that the search column is array
    var unwindOp = {$unwind: '$' + realColumnName_path};
    var matchOp = {$match: {}};

    var raw_rowObjects_coercionSchema = dataSourceDescription.raw_rowObjects_coercionScheme;
    var isDate = raw_rowObjects_coercionSchema && raw_rowObjects_coercionSchema[realColumnName]
        && raw_rowObjects_coercionSchema[realColumnName].operation === "ToDate";

    var isInteger = raw_rowObjects_coercionSchema && raw_rowObjects_coercionSchema[realColumnName]
        && raw_rowObjects_coercionSchema[realColumnName].operation === "ToInteger" ;

    var isFloat = raw_rowObjects_coercionSchema && raw_rowObjects_coercionSchema[realColumnName]
        && raw_rowObjects_coercionSchema[realColumnName].operation === "ToFloat" ;

    if (!isDate) {
        if (Array.isArray(searchQ)) {
            var match = [];
            for (var i = 0; i < searchQ.length; i++) {
                var obj = {};
                obj[realColumnName_path] = {$regex: searchQ[i], $options: "i"};
                match.push(obj);
            }
            matchOp["$match"]["$or"] = match;
        } else {
            if (isInteger) {
                matchOp["$match"][realColumnName_path] = parseInt(searchQ)
            } else if (isFloat) {
                 matchOp["$match"][realColumnName_path] = parseFloat(searchQ)
            } else {
                matchOp["$match"][realColumnName_path] = {$regex: searchQ, $options: "i"};
            }
        }
    } else {
        var realSearchValueMin, realSearchValueMax, searchDate;
        if (Array.isArray(searchQ)) {
            match = [];
            for (var i = 0; i < searchQ.length; i++) {
                searchDate = moment.utc('' + searchQ[i]);
                if (searchDate.isValid()) {
                    realSearchValueMin = searchDate.startOf('day').toDate();

                    if (searchQ[i].length == 4) { // Year
                        realSearchValueMax = searchDate.startOf('year').add(1, 'years').toDate();
                    } else if (searchQ[i].length < 8) { // Month
                        realSearchValueMax = searchDate.startOf('month').add(1, 'months').toDate();
                    } else { // Day
                        realSearchValueMax = searchDate.startOf('day').add(1, 'days').toDate();
                    }
                } else { // Invalid Date
                    return {err: 'Invalid Date'};
                }
                obj = {};
                obj[realColumnName_path] = {$gte: realSearchValueMin, $lt: realSearchValueMax};
                match.push(obj);
            }
            matchOp["$match"]["$or"] = match;
        } else {
            searchQ = '' + searchQ;
            searchDate = moment.utc(searchQ);
            if (searchDate.isValid()) {
                realSearchValueMin = searchDate.startOf('day').toDate();

                if (searchQ.length == 4) { // Year
                    realSearchValueMax = searchDate.startOf('year').add(1, 'years').toDate();
                } else if (searchQ.length < 8) { // Month
                    realSearchValueMax = searchDate.startOf('month').add(1, 'months').toDate();
                } else { // Day
                    realSearchValueMax = searchDate.startOf('day').add(1, 'days').toDate();
                }
            } else { // Invalid Date
                return {err: 'Invalid Date'};
            }
            matchOp["$match"][realColumnName_path] = {$gte: realSearchValueMin, $lt: realSearchValueMax};
        }
    }

    var groupOp = {
        $group: {
            _id: '$_id',
            pKey: {'$first': '$pKey'},
            srcDocPKey: {'$first': '$srcDocPKey'},
            rowParams: {'$first': '$rowParams'},
            wordExistence: {'$first': '$wordExistence'}
        }
    };

    return {matchOps: [unwindOp, matchOp, groupOp]};
};
module.exports.activeSearch_matchOp_orErrDescription = _activeSearch_matchOp_orErrDescription;

//

var _neededFilterValues = function(dataSourceDescription) {

    if (!dataSourceDescription.fe_filters.fieldsNotAvailable|| dataSourceDescription.fe_filters.fieldsNotAvailable.length == 0) {
        return {};
    }
    var excluding = {};
    for (var i = 0 ; i < dataSourceDescription.fe_filters.fieldsNotAvailable.length; i++) {
        excluding["limitedUniqValsByColName." + dataSourceDescription.fe_filters.fieldsNotAvailable[i]] = 0
    }
    return excluding;

}

var _topUniqueFieldValuesForFiltering = function (dataSourceDescription, callback) {

    var excludeValues = _neededFilterValues(dataSourceDescription);
    cached_values.findOne({srcDocPKey: dataSourceDescription._id},excludeValues,function (err, doc) {
        if (err) {
            callback(err, null);

            return;
        }
        
        if (doc == null) {
            callback(new Error('Missing cached values document for srcDocPKey: ' + dataSourceDescription._id), null);

            return;
        }
        var uniqueFieldValuesByFieldName = doc.limitedUniqValsByColName;
        if (uniqueFieldValuesByFieldName == null || typeof uniqueFieldValuesByFieldName === 'undefined') {
            callback(new Error('Unexpectedly missing uniqueFieldValuesByFieldName for srcDocPKey: ' + dataSourceDescription._id), null);

            return;
        }
        //
        // Now insert fabricated filters
        if (dataSourceDescription.fe_filters.fabricated) {
            var fabricatedFilters_length = dataSourceDescription.fe_filters.fabricated.length;
            for (var i = 0; i < fabricatedFilters_length; i++) {
                var fabricatedFilter = dataSourceDescription.fe_filters.fabricated[i];
                var choices = fabricatedFilter.choices;
                var choices_length = choices.length;
                var values = [];
                for (var j = 0; j < choices_length; j++) {
                    var choice = choices[j];
                    values.push(choice.title);
                }
                if (typeof uniqueFieldValuesByFieldName[fabricatedFilter.title] !== 'undefined') {
                    var errStr = 'Unexpectedly already-existent filter for the fabricated filter title ' + fabricatedFilter.title;
                    winston.error("❌  " + errStr);
                    callback(new Error(errStr), null);

                    return;
                }
                uniqueFieldValuesByFieldName[fabricatedFilter.title] = values;
            }
        }
        //
        // Now insert keyword filters
        if (dataSourceDescription.fe_filters.keywords) {
            var keywordFilters_length = dataSourceDescription.fe_filters.keywords.length;
            for (var i = 0; i < keywordFilters_length; i++) {
                var keywordFilter = dataSourceDescription.fe_filters.keywords[i];
                var choices = keywordFilter.choices;
                var choices_length = choices.length;
                var values = [];
                for (var j = 0; j < choices_length; j++) {
                    var choice = choices[j];
                    values.push(choice);
                }
                if (typeof uniqueFieldValuesByFieldName[keywordFilter.title] !== 'undefined') {
                    var errStr = 'Unexpectedly already-existent filter for the keyword filter title ' + keywordFilter.title;
                    winston.error("❌  " + errStr);
                    callback(new Error(errStr), null);

                    return;
                }
                uniqueFieldValuesByFieldName[keywordFilter.title] = values.sort();
            }
        }

        var finalizedUniqueFieldValuesByFieldName = [];


   

        _.forOwn(uniqueFieldValuesByFieldName, function (columnValue, columnName) {


            /* getting illegal values list */
            var illegalValues = [];


            if (dataSourceDescription.fe_filters.valuesToExcludeByOriginalKey) {

                if (dataSourceDescription.fe_filters.valuesToExcludeByOriginalKey._all) {
                    illegalValues = illegalValues.concat(dataSourceDescription.fe_filters.valuesToExcludeByOriginalKey._all);
                }
                var illegalValuesForThisKey = dataSourceDescription.fe_filters.valuesToExcludeByOriginalKey[columnName];

                if (illegalValuesForThisKey) {
                    illegalValues = illegalValues.concat(illegalValuesForThisKey);
                }

            }

            var raw_rowObjects_coercionSchema = dataSourceDescription.raw_rowObjects_coercionScheme;
            var revertType = false;
            var overwriteValue = false;

            var row = columnValue.slice();
            if (raw_rowObjects_coercionSchema && raw_rowObjects_coercionSchema[columnName]) {
                row = [];
                revertType = true;
            }



            if (typeof dataSourceDescription.fe_filters.oneToOneOverrideWithValuesByTitleByFieldName !== 'undefined' &&
                dataSourceDescription.fe_filters.oneToOneOverrideWithValuesByTitleByFieldName[columnName]) {
                var oneToOneOverrideWithValuesByTitleByFieldName = dataSourceDescription.fe_filters.oneToOneOverrideWithValuesByTitleByFieldName[columnName];
                overwriteValue = true;
            }
         
            var spliceCount = 0;

 
            columnValue.forEach(function(rowValue,index) {

 

                if (rowValue == null || typeof rowValue == 'undefined' || rowValue == "") {
                    return;
                }

                var existsInIllegalValueList = illegalValues.indexOf(rowValue);

                if (existsInIllegalValueList == -1) {
 
                    if (revertType) {
                        row.push(datatypes.OriginalValue(raw_rowObjects_coercionSchema[columnName], rowValue));
                    }

                    if (overwriteValue) {
                        var valueByOverride = oneToOneOverrideWithValuesByTitleByFieldName.find(function(item) {
                            return item.value == rowValue;
                        });

                  
                        if (valueByOverride) row[index] = valueByOverride.override;
                    }

               }
                else {
                    if (!revertType)  {
                        row.splice(index-spliceCount,1);
                        spliceCount++;
                    }
                }
            });


            // Sort by integer
            if (dataSourceDescription.fe_filters.fieldsSortableByInteger &&
                dataSourceDescription.fe_filters.fieldsSortableByInteger.indexOf(columnName) != -1) {

                row.sort(function (a, b) {
                    a = a.replace(/\D/g, '');
                    a = a == '' ? 0 : parseInt(a);
                    b = b.replace(/\D/g, '');
                    b = b == '' ? 0 : parseInt(b);
                    return a - b;
                });

            } else if (raw_rowObjects_coercionSchema[columnName] &&
                raw_rowObjects_coercionSchema[columnName].operation == 'ToDate') {

                row.sort(function(a, b) {
                    var dateA = new Date(a);
                    var dateB = new Date(b);
                    return dateA > dateB ? 1 : -1;
                });

            } else if ( (raw_rowObjects_coercionSchema[columnName] &&
                raw_rowObjects_coercionSchema[columnName].operation !== 'ToFloat' &&
                raw_rowObjects_coercionSchema[columnName].operation !== 'ToInteger') ||
                !raw_rowObjects_coercionSchema[columnName]) {

                row.sort(function (a, b) {
                    if (a !== null && b !== null) {
                        var A = a.toString().toUpperCase();
                        var B = b.toString().toUpperCase();

                        if (A < B) {
                            return -1;
                        }
                        if (A > B) {
                            return 1;
                        }
                    }

                    // names must be equal
                    return 0;
                });
            } else {
                row.sort(function(a,b) {
                    return a - b;
                })
            }

            // Sort in reverse order
            if (dataSourceDescription.fe_filters.fieldsSortableInReverseOrder &&
                dataSourceDescription.fe_filters.fieldsSortableInReverseOrder.indexOf(columnName) != -1) {
                row.reverse();
            }

            finalizedUniqueFieldValuesByFieldName.push({
                name: columnName,
                values: row
            });
        });

        finalizedUniqueFieldValuesByFieldName.sort(function(a, b) {
            var nameA = a.name;
            var nameB = b.name;
            if (dataSourceDescription.fe_displayTitleOverrides) {
                if (dataSourceDescription.fe_displayTitleOverrides[nameA])
                    nameA = dataSourceDescription.fe_displayTitleOverrides[nameA];
                if (dataSourceDescription.fe_displayTitleOverrides[nameB])
                    nameB = dataSourceDescription.fe_displayTitleOverrides[nameB];
            }

            nameA = nameA.toUpperCase();
            nameB = nameB.toUpperCase();

            if (nameA < nameB) {
                return -1;
            }
            if (nameA > nameB) {
                return 1;
            }

            // names must be equal
            return 0;
        });
        //
        callback(null, finalizedUniqueFieldValuesByFieldName);
    });
};
module.exports.topUniqueFieldValuesForFiltering = _topUniqueFieldValuesForFiltering;

//for object_detail
var _reverseDataToBeDisplayableVal = function (originalVal, key, dataSourceDescription) {

 
   

    var displayableVal = originalVal;
    // var prototypeName = Object.prototype.toString.call(originalVal);
    // if (prototypeName === '[object Date]') {
    // }
    // ^ We could check this but we ought to have the info, and checking the
    // coersion scheme will make this function slightly more rigorous.
    // Perhaps we could do some type-introspection automated formatting later
    // here if needed, but I think generally that kind of thing would be done case-by-case
    // in the template, such as comma-formatting numbers.

    var raw_rowObjects_coercionScheme = dataSourceDescription.raw_rowObjects_coercionScheme;
    if (raw_rowObjects_coercionScheme && typeof raw_rowObjects_coercionScheme !== 'undefined') {
        var coersionSchemeOfKey = raw_rowObjects_coercionScheme["" + key];
        if (coersionSchemeOfKey && typeof coersionSchemeOfKey !== 'undefined') {
            var _do = coersionSchemeOfKey.operation;
            if (_do === "ToDate") {
                if (originalVal == null || originalVal == "") {
                    return originalVal; // do not attempt to format
                }

                var dateFormat = coersionSchemeOfKey.outputFormat;


                // if (!fe_outputInFormat && typeof fe_outputInFormat == 'undefined') {
                //     var outputInFormat_ofKey = fe_outputInFormat["" + key];
                //     if (outputInFormat_ofKey && typeof outputInFormat_ofKey !== 'undefined') {
                //         dateFormat = outputInFormat_ofKey.format || null; // || null to hit check below
                //     }
                // }

                if (dateFormat == null || dateFormat == "ISO_8601") { // still null? use default
                    dateFormat = config.defaultDateFormat;
                }

                
                displayableVal = moment(originalVal, moment.ISO_8601).utc().format(dateFormat);
            } else { // nothing to do? (no other types yet)
            }
        } else { // nothing to do?
        }
    } else { // nothing to do?
    }
    //


    return displayableVal;
};
module.exports.reverseDataToBeDisplayableVal = _reverseDataToBeDisplayableVal;

//
var _convertDateToBeRecognizable = function (originalVal, key, dataSourceDescription) {
    var dateToFormat = new Date(originalVal)
    try{
        var displayableVal = dateToFormat.toISOString();
    }
    catch(e) {
        console.log(e + ": " + dateToFormat)
        var displayableVal = originalVal;
    }
    // var prototypeName = Object.prototype.toString.call(originalVal);
    // if (prototypeName === '[object Date]') {
    // }
    // ^ We could check this but we ought to have the info, and checking the
    // coersion scheme will make this function slightly more rigorous.
    // Perhaps we could do some type-introspection automated formatting later
    // here if needed, but I think generally that kind of thing would be done case-by-case
    // in the template, such as comma-formatting numbers.
    var raw_rowObjects_coercionScheme = dataSourceDescription.raw_rowObjects_coercionScheme;
    if (raw_rowObjects_coercionScheme && typeof raw_rowObjects_coercionScheme !== 'undefined') {
        var coersionSchemeOfKey = raw_rowObjects_coercionScheme["" + key];
        if (coersionSchemeOfKey && typeof coersionSchemeOfKey !== 'undefined') {
            var _do = coersionSchemeOfKey.operation;
            if (_do === "ToDate") {
                if (originalVal == null || originalVal == "") {
                    return originalVal; // do not attempt to format
                }
                var newDateValue = moment(displayableVal, moment.ISO_8601).utc().format(coersionSchemeOfKey.outputFormat);
            }
        }
    }
    //
    return newDateValue;
};
module.exports.convertDateToBeRecognizable = _convertDateToBeRecognizable;

//
function _new_truesByFilterValueByFilterColumnName_forWhichNotToOutputColumnNameInPill(dataSourceDescription) {
    var truesByFilterValueByFilterColumnName_forWhichNotToOutputColumnNameInPill = {};
    var fe_filters_fabricatedFilters = dataSourceDescription.fe_filters.fabricated;
    if (typeof fe_filters_fabricatedFilters !== 'undefined') {
        var fe_filters_fabricatedFilters_length = fe_filters_fabricatedFilters.length;
        for (var i = 0; i < fe_filters_fabricatedFilters_length; i++) {
            var fabricatedFilter = fe_filters_fabricatedFilters[i];
            var filterCol = fabricatedFilter.title;
            truesByFilterValueByFilterColumnName_forWhichNotToOutputColumnNameInPill[filterCol] = {};
            var choices = fabricatedFilter.choices;
            var choices_length = choices.length;
            if (choices_length == 1) { // then we do not want to display the filter col key for this one
                for (var j = 0; j < choices_length; j++) {
                    var choice = choices[j];
                    var filterVal = choice.title;
                    truesByFilterValueByFilterColumnName_forWhichNotToOutputColumnNameInPill[filterCol][filterVal] = true;
                }
            }
        }
    }

    return truesByFilterValueByFilterColumnName_forWhichNotToOutputColumnNameInPill;
};
module.exports.new_truesByFilterValueByFilterColumnName_forWhichNotToOutputColumnNameInPill = _new_truesByFilterValueByFilterColumnName_forWhichNotToOutputColumnNameInPill;

//
function _filterObjFromQueryParams(queryParams) {
    var filterObj = {};
    var reservedKeys = ['source_key', 'sortBy', 'sortDir', 'page', 'groupBy', 'chartBy', 'stackBy', 'mapBy', 'aggregateBy', 'searchQ', 'searchCol', 'embed'];
    for (var key in queryParams) {
        if (reservedKeys.indexOf(key) !== -1) continue;

        if (queryParams[key] != '') {
            filterObj[key] = queryParams[key];
        }
    }
    return filterObj;
};

module.exports.filterObjFromQueryParams = _filterObjFromQueryParams;

function _valueToExcludeByOriginalKey(originalVal, dataSourceDescription, groupBy_realColumnName, viewType) {

    var obj = _convertArrayObjectToObject(dataSourceDescription.fe_views.views[viewType]["valuesToExcludeByOriginalKey"]);
    //
    var fe_valuesToExcludeByOriginalKey = obj;
    if (fe_valuesToExcludeByOriginalKey != null) {
        if (fe_valuesToExcludeByOriginalKey._all) {
            //escape double quote
            if (originalVal == "" &&  fe_valuesToExcludeByOriginalKey._all.indexOf('\"\"') !== -1) {
                return null;
            }
            if (fe_valuesToExcludeByOriginalKey._all.indexOf(originalVal) !== -1) {
                return null; // do not push to list
            }
        }
        var illegalValuesForThisKey = fe_valuesToExcludeByOriginalKey[groupBy_realColumnName];
        if (illegalValuesForThisKey) {
            if (illegalValuesForThisKey.indexOf(originalVal) !== -1) {
                return null; // do not push to list
            }
        }
    }
    //
    var displayableVal = originalVal;
    if (originalVal == null) {
        displayableVal = "(null)"; // null breaks chart but we don't want to lose its data
    } else if (originalVal === "") {
        displayableVal = "(not specified)"; // we want to show a category for it rather than it appearing broken by lacking a category
    }

    return displayableVal;
}

module.exports.ValueToExcludeByOriginalKey = _valueToExcludeByOriginalKey;


function _calcContentColor(backgroundColor) {
    if (!backgroundColor) return '#000000';
    // brightness method described here - http://alienryderflex.com/hsp.html
    var r, g, b;
    var rWeight = .299,
        gWeight = .587,
        bWeight = .114;


    // Calculate individual color components
    r = parseInt('0x' + backgroundColor.slice(1,3)) / 255;
    g = parseInt('0x' + backgroundColor.slice(3,5)) / 255;
    b = parseInt('0x' + backgroundColor.slice(5,7)) / 255;

    var brightness = Math.sqrt(rWeight * (r * r) + gWeight * (g * g) + bWeight * (b * b));

    if (brightness > 0.54) {

        return '#000000';
    }

    return '#FFFFFF';
}

module.exports.calcContentColor = _calcContentColor;
