var moment = require('moment');

module.exports = function(nunjucks_env)
{
    nunjucks_env.addFilter('comma', require('nunjucks-comma-filter'));
    // General/shared
    nunjucks_env.addFilter('dateFormattedAs_monthDayYear', function(date)
    {
        return moment(date).format("MMMM Do, YYYY");
    });
    nunjucks_env.addFilter('dateFormat', function(date, format)
    {
        return format !== null ? moment(date).format(format) : moment(date).format("MMMM Do, YYYY");
    });
    nunjucks_env.addFilter('isArray', function(val)
    {
        return Array.isArray(val);
    });
    nunjucks_env.addFilter('doesArrayContain', function(array, member)
    {
        if (Array.isArray(array))
            return array.indexOf(member) !== -1;
        else if (typeof array === 'string')
            return array == member;

        return false;
    });
    nunjucks_env.addFilter('isObjectEmpty', function(obj)
    {
        return Object.keys(obj).length === 0;
    });
    nunjucks_env.addFilter('alphaSortedArray', function(array)
    {
        return array.sort();
    });
    // Array views - Filter obj construction
    nunjucks_env.addFilter('constructedFilterObj', function(existing_filterObj, this_filterCol, this_filterVal, isThisAnActiveFilter)
    {
        var filterObj = {};
        var existing_filterCols = Object.keys(existing_filterObj);
        var existing_filterCols_length = existing_filterCols.length;
        for (var i = 0 ; i < existing_filterCols_length ; i++) {
            var existing_filterCol = existing_filterCols[i];
            if (existing_filterCol == this_filterCol) {
                continue; // never push other active values of this is filter col is already active
                // which means we never allow more than one filter on the same column at present
            }
            var existing_filterVals = existing_filterObj[existing_filterCol];
            if (typeof existing_filterVals === 'string') existing_filterVals = [existing_filterVals];
            //
            var filterVals = [];
            //
            var existing_filterVals_length = existing_filterVals.length;
            for (var j = 0 ; j < existing_filterVals_length ; j++) {
                var existing_filterVal = existing_filterVals[j];
                var encoded_existing_filterVal = typeof existing_filterVal === 'string' ? encodeURIComponent(existing_filterVal) : existing_filterVal;
                filterVals.push(encoded_existing_filterVal);
            }
            //
            if (filterVals.length !== 0) {
                filterObj[existing_filterCol] = filterVals; // as it's not set yet
            }
        }
        //
        if (isThisAnActiveFilter === false) { // do not push if active, since we'd want the effect of unsetting it
            var filterVals = filterObj[this_filterCol] || [];
            if (filterVals.indexOf(filterVal) == -1) {
                var filterIsString = typeof this_filterVal === 'string';
                var filterVal = filterIsString ? encodeURIComponent(this_filterVal) : this_filterVal;
                filterVals.push(filterVal);
            }
            filterObj[this_filterCol] = filterVals.length > 1 ? filterVals : filterVals[0];
        }
        //
        return filterObj;
    });
    // Array views - Filter value to display
    nunjucks_env.addFilter('filterValToDisplay', function(filterVal){
        if (typeof filterVal === 'string')
            return decodeURIComponent(filterVal);
        var output = '';
        if (!isNaN(filterVal.min))
            output = filterVal.min;
        else if (filterVal.min !== null)
            output = output + moment(filterVal.min).format("MMMM Do, YYYY");
        output = output + ' – ';
        if (!isNaN(filterVal.max))
            output = output + filterVal.max;
        else if (filterVal.max !== null)
            output = output + moment(filterVal.max).format("MMMM Do, YYYY");
        return output;
    });
    // Array views - Filter route path
    nunjucks_env.addFilter('constructedRoutePath', function(routePath_base, filterObj, queryObj) {
        // Merge filterObj to queryObj
        var _queryObj = {};
        if (filterObj)
            for (var key in filterObj)
                if (filterObj.hasOwnProperty(key))
                    _queryObj[key] = filterObj[key];

        if (queryObj)
            for (var key in queryObj)
                if (queryObj.hasOwnProperty(key))
                    _queryObj[key] = queryObj[key];

        var routePath = '';
        for (key in _queryObj)
            if (_queryObj.hasOwnProperty(key) && _queryObj[key] !== undefined) {
                if (typeof _queryObj[key] === 'string')
                    routePath += '&' + key + '=' + _queryObj[key];
                else if (Array.isArray(_queryObj[key])) {
                    var subArray = _queryObj[key];
                    for (var i = 0; i < subArray.length; i ++)
                        if (typeof subArray[i] === 'string')
                            routePath += '&' + key + '=' + subArray[i];
                        else
                            routePath += '&' + key + '=';
                } else {
                    // Invalid query object
                }
            }

        if (routePath == '') return routePath_base;

        var joinChar = routePath_base.indexOf('?') !== -1 ? '&' : '?';
        return routePath_base + joinChar + routePath.substr(1);
    });
};