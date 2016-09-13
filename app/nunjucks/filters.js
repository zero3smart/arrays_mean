var moment = require('moment');

module.exports = function(nunjucks_env)
{
    nunjucks_env.addFilter('comma', require('nunjucks-comma-filter'));
    // General/shared
    nunjucks_env.addFilter('dateFormattedAs_monthDayYear', function(date)
    {
        return moment(date).format("MMMM Do, YYYY");
    });
    nunjucks_env.addFilter('addDate', function(date, amount, format)
    {
        return moment(date).add(amount, format).toDate();
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
            filterObj[existing_filterCol] = existing_filterVals; // as it's not set yet
        }
        //
        if (isThisAnActiveFilter === false) { // do not push if active, since we'd want the effect of unsetting it
            var filterVals = filterObj[this_filterCol] || [];
            if (Array.isArray(this_filterVal) && filterVals.indexOf(this_filterVal) == -1) {
                filterVals.push(filterVal);
                filterObj[this_filterCol] = filterVals.length == 1 ? filterVals[0] : filterVals;
            } else {
                filterObj[this_filterCol] = this_filterVal;
            }
        }
        //
        return filterObj;
    });
    // Array views - Filter value to display
        nunjucks_env.addFilter('filterValToDisplay', function(filterVal){
        if (typeof filterVal === 'string') {
            var _filterVal = decodeURIComponent(filterVal);
            try {
                filterVal = JSON.parse(_filterVal);
            } catch (e) {
                return _filterVal;
            }
            if (typeof filterVal === 'number' || typeof filterVal === 'string') return filterVal;
        }
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
                if (filterObj.hasOwnProperty(key) && filterObj[key] !== undefined)
                    _queryObj[key] = filterObj[key];

        if (queryObj)
            for (var key in queryObj)
                if (queryObj.hasOwnProperty(key) && queryObj[key] !== undefined)
                    _queryObj[key] = queryObj[key];

        var routePath = '';
        for (key in _queryObj)
            if (_queryObj.hasOwnProperty(key) && _queryObj[key] !== undefined) {
                if (typeof _queryObj[key] === 'string') {
                    routePath += '&' + key + '=' + _queryObj[key];
                } else if (Array.isArray(_queryObj[key])) {
                    var subArray = _queryObj[key];
                    for (var i = 0; i < subArray.length; i ++)
                        if (typeof subArray[i] === 'string')
                            routePath += '&' + key + '=' + subArray[i];
                        else
                            routePath += '&' + key + '=';
                } else {
                    // Unexpected format
                }
            }

        if (routePath == '') return routePath_base;

        var joinChar = routePath_base.indexOf('?') !== -1 ? '&' : '?';
        return routePath_base + joinChar + routePath.substr(1);
    });
};