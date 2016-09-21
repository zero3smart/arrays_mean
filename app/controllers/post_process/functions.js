var winston = require('winston');
var moment = require('moment');

var importedDataPreparation = require('../../datasources/utils/imported_data_preparation');
var cached_values_model = require('../../models/cached_values_model');
var import_datatypes = require('../../datasources/utils/import_datatypes');
var config = new require('./config.js')();

var constructor = function() {
    var self = this;
    //
    self._routePathByAppendingQueryStringToVariationOfBase = function(routePath_variation, queryString, routePath_base)
    {
        if (routePath_variation === routePath_base) {
            routePath_variation += "?";
        } else {
            routePath_variation += "&";
        }
        routePath_variation += queryString;

        return routePath_variation;
    };
    //
    self._urlQueryByAppendingQueryStringToExistingQueryString = function(existingQueryString, queryStringToAppend)
    {
        var newWholeQueryString = existingQueryString;
        if (existingQueryString.length == 0) {
            newWholeQueryString += "?";
        } else {
            newWholeQueryString += "&";
        }
        newWholeQueryString += queryStringToAppend;

        return newWholeQueryString;
    };
    //
    self._activeFilter_matchOp_orErrDescription_fromMultiFilter = function(dataSourceDescription, filterObj)
    {
        var filterCols = Object.keys(filterObj);
        var filterCols_length = filterCols.length;
        if (filterCols_length == 0) {
            winston.error("❌  Programmer runtime check error. Filter obj had no keys.");
            return { err: new Error("No active filter despite filterObj") };
        }
        var conditions = [];
        for (var i = 0 ; i < filterCols_length ; i++) {
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
                //console.log('---------- filter', filterCol, filterVal);
                if (typeof filterVal === 'string' || typeof filterVal === 'number') {
                    matchConditions = self._activeFilter_matchCondition_orErrDescription(dataSourceDescription, filterCol, filterVal);
                } else if (filterVal.min != undefined || filterVal.max != undefined) {
                    matchConditions = self._activeFilterRange_matchCondition_orErrDescription(dataSourceDescription, filterCol, filterVal.min, filterVal.max);
                } else if (Array.isArray(filterVal)) {
                    matchConditions = self._activeFilterOR_matchCondition_orErrDescription(dataSourceDescription, filterCol, filterVal);
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
            return { err: new Error("No match conditions in multifilter despite filterObj") };
        }

        return { matchOps: conditions };
    };
    //
    self._activeFilter_matchCondition_orErrDescription = function(dataSourceDescription, filterCol, filterVal)
    {
        var matchConditions = undefined;
        var isAFabricatedFilter = false; // finalize
        if (dataSourceDescription.fe_filters_fabricatedFilters) {
            var fabricatedFilters_length = dataSourceDescription.fe_filters_fabricatedFilters.length;
            for (var i = 0 ; i < fabricatedFilters_length ; i++) {
                var fabricatedFilter = dataSourceDescription.fe_filters_fabricatedFilters[i];
                if (fabricatedFilter.title === filterCol) {
                    isAFabricatedFilter = true;
                    // Now find the applicable filter choice
                    var choices = fabricatedFilter.choices;
                    var choices_length = choices.length;
                    var foundChoice = false;
                    for (var j = 0 ; j < choices_length ; j++) {
                        var choice = choices[j];
                        if (choice.title === filterVal) {
                            foundChoice = true;
                            matchConditions = [{$match: choice["$match"]}];

                            break; // found the applicable filter choice
                        }
                    }
                    if (foundChoice == false) { // still not found despite the filter col being recognized as fabricated
                        return { err: new Error("No such choice \"" + filterVal + "\" for filter " + filterCol) };
                    }

                    break; // found the applicable fabricated filter
                }
            }
        }

        if (isAFabricatedFilter == true) { // already obtained matchConditions just above
            if (typeof matchConditions === 'undefined') {
                return { err: new Error("Unexpectedly missing matchConditions given fabricated filter…" + JSON.stringify(urlQuery)) };
            }
        } else {
            var realColumnName = importedDataPreparation.RealColumnNameFromHumanReadableColumnName(filterCol, dataSourceDescription);
            var realColumnName_path = "rowParams." + realColumnName;
            var realFilterValue = filterVal; // To finalize in case of override…
            // To coercion the date field into the valid date
            var raw_rowObjects_coercionSchema = dataSourceDescription.raw_rowObjects_coercionScheme;
            var isDate = raw_rowObjects_coercionSchema && raw_rowObjects_coercionSchema[realColumnName]
                && raw_rowObjects_coercionSchema[realColumnName].do === import_datatypes.Coercion_ops.ToDate;

            if (!isDate) {
                var oneToOneOverrideWithValuesByTitleByFieldName = dataSourceDescription.fe_filters_oneToOneOverrideWithValuesByTitleByFieldName || {};
                var oneToOneOverrideWithValuesByTitle_forThisColumn = oneToOneOverrideWithValuesByTitleByFieldName[realColumnName];
                if (oneToOneOverrideWithValuesByTitle_forThisColumn) {
                    var overrideValue = oneToOneOverrideWithValuesByTitle_forThisColumn[filterVal];
                    if (typeof overrideValue === 'undefined') {
                        var errString = "Missing override value for overridden column " + realColumnName + " and incoming filterVal " + filterVal;
                        winston.error("❌  " + errString); // we'll just use the value they entered - maybe a user is manually editing the URL
                    } else {
                        realFilterValue = overrideValue;
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

                matchConditions = self._activeSearch_matchOp_orErrDescription(dataSourceDescription, realColumnName, realFilterValue).matchOps;

            } else {
                matchConditions = self._activeSearch_matchOp_orErrDescription(dataSourceDescription, realColumnName, filterVal).matchOps;
            }
        }
        if (typeof matchConditions === 'undefined') {
            throw new Error("Undefined match condition");
        }

        return { matchConditions: matchConditions };
    };
    //
    self._activeFilterRange_matchCondition_orErrDescription = function(dataSourceDescription, filterCol, filterValMin, filterValMax)
    {
        var realColumnName = importedDataPreparation.RealColumnNameFromHumanReadableColumnName(filterCol, dataSourceDescription);
        var realColumnName_path = "rowParams." + realColumnName;
        var realFilterValueMin = filterValMin, realFilterValueMax = filterValMax; // To finalize in case of override…
        // To coercion the date field into the valid date
        var raw_rowObjects_coercionSchema = dataSourceDescription.raw_rowObjects_coercionScheme;
        var isDate = raw_rowObjects_coercionSchema && raw_rowObjects_coercionSchema[realColumnName]
            && raw_rowObjects_coercionSchema[realColumnName].do === import_datatypes.Coercion_ops.ToDate;
        if (!isDate) {
            var oneToOneOverrideWithValuesByTitleByFieldName = dataSourceDescription.fe_filters_oneToOneOverrideWithValuesByTitleByFieldName || {};
            var oneToOneOverrideWithValuesByTitle_forThisColumn = oneToOneOverrideWithValuesByTitleByFieldName[realColumnName];
            if (oneToOneOverrideWithValuesByTitle_forThisColumn) {
                var overrideValueMin = oneToOneOverrideWithValuesByTitle_forThisColumn[filterValMin];
                if (typeof overrideValueMin === 'undefined') {
                    var errString = "Missing override value for overridden column " + realColumnName + " and incoming filterValMin " + filterValMin;
                    winston.error("❌  " + errString); // we'll just use the value they entered - maybe a user is manually editing the URL
                    throw new Error("Undefined match condition");
                } else {
                    realFilterValueMin = overrideValueMin;
                }

                var overrideValueMax = oneToOneOverrideWithValuesByTitle_forThisColumn[filterValMax];
                if (typeof overrideValueMax === 'undefined') {
                    var errString = "Missing override value for overridden column " + realColumnName + " and incoming filterValMax " + filterValMax;
                    winston.error("❌  " + errString); // we'll just use the value they entered - maybe a user is manually editing the URL
                    throw new Error("Undefined match condition");
                } else {
                    realFilterValueMax = overrideValueMax;
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
        var projectOp = { $project: {
            _id: 1,
            pKey: 1,
            srcDocPKey: 1,
            rowIdxInDoc: 1,
            rowParams: 1,
            matchingField: {
                $cond: {
                    if: { $isArray: "$" + realColumnName_path },
                    then: { $size: "$" + realColumnName_path }, // gets the number of items in the array
                    else: "$" + realColumnName_path
                }
            }
        }};

        var matchOp = { $match: {} };
        matchOp["$match"]["matchingField"] = {$gte: realFilterValueMin, $lt: realFilterValueMax};

        return { matchConditions: [projectOp, matchOp] };
    };
    //
    self._activeFilterOR_matchCondition_orErrDescription = function(dataSourceDescription, filterCol, filterVal)
    {
        var matchConditions = undefined;
        var isAFabricatedFilter = false; // finalize
        if (dataSourceDescription.fe_filters_fabricatedFilters) {
            var fabricatedFilters_length = dataSourceDescription.fe_filters_fabricatedFilters.length;
            for (var i = 0 ; i < fabricatedFilters_length ; i++) {
                var fabricatedFilter = dataSourceDescription.fe_filters_fabricatedFilters[i];
                if (fabricatedFilter.title === filterCol) {
                    isAFabricatedFilter = true;
                    // Now find the applicable filter choice
                    var choices = fabricatedFilter.choices;
                    var choices_length = choices.length;

                    for (var k = 0; k < filterVal.length; k ++) {

                        var foundChoice = false;
                        for (var j = 0; j < choices_length; j++) {
                            var choice = choices[j];
                            if (choice.title === filterVal[k]) {
                                foundChoice = true;
                                matchConditions = [{$match: choice["$match"]}];

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
                return { err: new Error("Unexpectedly missing matchConditions given fabricated filter…" + JSON.stringify(urlQuery)) };
            }
        } else {
            var realColumnName = importedDataPreparation.RealColumnNameFromHumanReadableColumnName(filterCol, dataSourceDescription);
            var realColumnName_path = "rowParams." + realColumnName;

            // To coercion the date field into the valid date
            var raw_rowObjects_coercionSchema = dataSourceDescription.raw_rowObjects_coercionScheme;
            var isDate = raw_rowObjects_coercionSchema && raw_rowObjects_coercionSchema[realColumnName]
                && raw_rowObjects_coercionSchema[realColumnName].do === import_datatypes.Coercion_ops.ToDate;

            if (!isDate) {
                for (var i = 0; i < filterVal.length; i ++) {
                    var realFilterValue = filterVal[i]; // To finalize in case of override…
                    var oneToOneOverrideWithValuesByTitleByFieldName = dataSourceDescription.fe_filters_oneToOneOverrideWithValuesByTitleByFieldName || {};
                    var oneToOneOverrideWithValuesByTitle_forThisColumn = oneToOneOverrideWithValuesByTitleByFieldName[realColumnName];
                    if (oneToOneOverrideWithValuesByTitle_forThisColumn) {
                        var overrideValue = oneToOneOverrideWithValuesByTitle_forThisColumn[realFilterValue];
                        if (typeof overrideValue === 'undefined') {
                            var errString = "Missing override value for overridden column " + realColumnName + " and incoming filterVal " + filterVal;
                            winston.error("❌  " + errString); // we'll just use the value they entered - maybe a user is manually editing the URL
                        } else {
                            realFilterValue = overrideValue;
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

            matchConditions = self._activeSearch_matchOp_orErrDescription(dataSourceDescription, realColumnName, filterVal).matchOps;
        }

        if (typeof matchConditions === 'undefined') {
            throw new Error("Undefined match condition");
        }

        return { matchConditions: matchConditions };
    };
    // returns dictionary with err or matchOp
    self._activeSearch_matchOp_orErrDescription = function(dataSourceDescription, searchCol, searchQ)
    {
        var realColumnName = importedDataPreparation.RealColumnNameFromHumanReadableColumnName(searchCol, dataSourceDescription);
        var realColumnName_path = "rowParams." + realColumnName;

        // We need to consider that the search column is array
        var unwindOp = { $unwind: '$' + realColumnName_path };
        var matchOp = { $match: {} };

        var raw_rowObjects_coercionSchema = dataSourceDescription.raw_rowObjects_coercionScheme;
        var isDate = raw_rowObjects_coercionSchema && raw_rowObjects_coercionSchema[realColumnName]
            && raw_rowObjects_coercionSchema[realColumnName].do === import_datatypes.Coercion_ops.ToDate;
        if (!isDate) {
            if (Array.isArray(searchQ)) {
                var match = [];
                for (var i = 0; i < searchQ.length; i ++) {
                    var obj = {};
                    obj[realColumnName_path] = {$regex: searchQ[i], $options: "i"};
                    match.push(obj);
                }
                matchOp["$match"]["$or"] = match;
            } else {
                matchOp["$match"][realColumnName_path] = {$regex: searchQ, $options: "i"};
            }
        } else {
            var realSearchValueMin, realSearchValueMax, searchDate;
            if (Array.isArray(searchQ)) {
                match = [];
                for (var i = 0; i < searchQ.length; i ++) {
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
                rowIdxInDoc: {'$first': '$rowIdxInDoc'},
                rowParams: {'$first': '$rowParams'},
                wordExistence: {'$first': '$wordExistence'}
            }
        };

        return { matchOps: [unwindOp, matchOp, groupOp] };
    };
    //
    self._topUniqueFieldValuesForFiltering = function(source_pKey, dataSourceDescription, callback)
    {
        cached_values_model.MongooseModel.findOne({ srcDocPKey: source_pKey }, function(err, doc)
        {
            if (err) {
                callback(err, null);

                return;
            }
            if (doc == null) {
                callback(new Error('Missing cached values document for srcDocPKey: ' + source_pKey), null);

                return;
            }
            var uniqueFieldValuesByFieldName = doc.limitedUniqValsByHumanReadableColName;
            if (uniqueFieldValuesByFieldName == null || typeof uniqueFieldValuesByFieldName === 'undefined') {
                callback(new Error('Unexpectedly missing uniqueFieldValuesByFieldName for srcDocPKey: ' + source_pKey), null);

                return;
            }
            //
            // Now insert fabricated filters
            if (dataSourceDescription.fe_filters_fabricatedFilters) {
                var fabricatedFilters_length = dataSourceDescription.fe_filters_fabricatedFilters.length;
                for (var i = 0 ; i < fabricatedFilters_length ; i++) {
                    var fabricatedFilter = dataSourceDescription.fe_filters_fabricatedFilters[i];
                    var choices = fabricatedFilter.choices;
                    var choices_length = choices.length;
                    var values = [];
                    for (var j = 0 ; j < choices_length ; j++) {
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
            if (dataSourceDescription.fe_filters_keywordFilters) {
                var keywordFilters_length = dataSourceDescription.fe_filters_keywordFilters.length;
                for (var i = 0 ; i < keywordFilters_length ; i++) {
                    var keywordFilter = dataSourceDescription.fe_filters_keywordFilters[i];
                    var choices = keywordFilter.choices;
                    var choices_length = choices.length;
                    var values = [];
                    for (var j = 0 ; j < choices_length ; j++) {
                        var choice = choices[j];
                        values.push(choice);
                    }
                    if (typeof uniqueFieldValuesByFieldName[keywordFilter.title] !== 'undefined') {
                        var errStr = 'Unexpectedly already-existent filter for the keyword filter title ' + keywordFilter.title;
                        winston.error("❌  " + errStr);
                        callback(new Error(errStr), null);

                        return;
                    }
                    uniqueFieldValuesByFieldName[keywordFilter.title] = values;
                }
            }
            //
            callback(null, uniqueFieldValuesByFieldName);
        });
    };
    //
    self._reverseDataTypeCoersionToMakeFEDisplayableValFrom = function(originalVal, key, dataSourceDescription)
    {
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
                var _do = coersionSchemeOfKey.do;
                if (_do === import_datatypes.Coercion_ops.ToDate) {
                    if (originalVal == null || originalVal == "") {
                        return originalVal; // do not attempt to format
                    }
                    var dateFormat = null;
                    var fe_outputInFormat = dataSourceDescription.fe_outputInFormat;
                    if (fe_outputInFormat && typeof fe_outputInFormat !== 'undefined') {
                        var outputInFormat_ofKey = fe_outputInFormat["" + key];
                        if (outputInFormat_ofKey && typeof outputInFormat_ofKey !== 'undefined') {
                            dateFormat = outputInFormat_ofKey.format || null; // || null to hit check below
                        }
                    }
                    if (dateFormat == null) { // still null - no specific ovrride, so check initial coersion
                        var opts = coersionSchemeOfKey.opts;
                        if (opts && typeof opts !== 'undefined') {
                            dateFormat = opts.format;
                        }
                    }
                    if (dateFormat == null) { // still null? use default
                        dateFormat = config.defaultFormat;
                    }
                    displayableVal = moment('' + originalVal).utc().format(dateFormat);
                } else { // nothing to do? (no other types yet)
                }
            } else { // nothing to do?
            }
        } else { // nothing to do?
        }
        //
        return displayableVal;
    };
    //
    self._new_truesByFilterValueByFilterColumnName_forWhichNotToOutputColumnNameInPill = function (dataSourceDescription)
    {
        var truesByFilterValueByFilterColumnName_forWhichNotToOutputColumnNameInPill = {};
        var fe_filters_fabricatedFilters = dataSourceDescription.fe_filters_fabricatedFilters;
        if (typeof fe_filters_fabricatedFilters !== 'undefined') {
            var fe_filters_fabricatedFilters_length = fe_filters_fabricatedFilters.length;
            for (var i = 0 ; i < fe_filters_fabricatedFilters_length ; i++) {
                var fabricatedFilter = fe_filters_fabricatedFilters[i];
                var filterCol = fabricatedFilter.title;
                truesByFilterValueByFilterColumnName_forWhichNotToOutputColumnNameInPill[filterCol] = {};
                var choices = fabricatedFilter.choices;
                var choices_length = choices.length;
                if (choices_length == 1) { // then we do not want to display the filter col key for this one
                    for (var j = 0 ; j < choices_length ; j++) {
                        var choice = choices[j];
                        var filterVal = choice.title;
                        truesByFilterValueByFilterColumnName_forWhichNotToOutputColumnNameInPill[filterCol][filterVal] = true;
                    }
                }
            }
        }

        return truesByFilterValueByFilterColumnName_forWhichNotToOutputColumnNameInPill;
    };
    //
    self.filterObjFromQueryParams = function(queryParams) {
        var filterObj = {};
        var reservedKeys = ['source_key', 'sortBy', 'sortDir', 'page', 'groupBy', 'mapBy', 'searchQ', 'searchCol'];
        for (var key in queryParams) {
            if (reservedKeys.indexOf(key) !== -1) continue;

            if (queryParams[key] != '') {
                filterObj[key] = queryParams[key];
            }
        }
        return filterObj;
    }

    return self;
};

module.exports = constructor;