var moment = require('moment');
var url = require('url');
var datatypes = require('../app/libs/datasources/datatypes.js');

module.exports = function (nunjucks_env,env) {



    nunjucks_env.addFilter('comma', require('nunjucks-comma-filter'));
    // General/shared
    nunjucks_env.addFilter('dateFormattedAs_monthDayYear', function (date) {
        return moment(date).utc().format("MMMM Do, YYYY");
    });
    nunjucks_env.addFilter('addDate', function (date, amount, format) {
        return moment(date).add(amount, format).toDate();
    });
    nunjucks_env.addFilter('dateFormat', function (date, format) {
        return format ? moment(date).utc().format(format) : moment(date).utc().format("MMMM Do, YYYY");
    });
    nunjucks_env.addFilter('isArray', function (val) {
        return Array.isArray(val);
    });

    nunjucks_env.addFilter('doesArrayContain', function (array, member) {

        if (Array.isArray(array))
            return array.indexOf(member) !== -1 || array.indexOf(parseInt(member)) !== -1;
        else if (typeof array === 'string') {
            if (array == '' + member) return true;

            try {
                var obj = JSON.parse(array);
                if (Array.isArray(obj))
                    return obj.indexOf(member) !== -1 || obj.indexOf(parseInt(member)) !== -1;
            } catch (e) {
                return false;
            }
        }
        return false;
    });

    nunjucks_env.addFilter('findViewDisplayName',function(array,default_view) {
        if (Array.isArray(array)) {
            for (var i = 0; i < array.length; i++) {
                if (array[i].name == default_view) {
                    return array[i].displayAs;
                }
            }
        }
        return "Gallery";
    })

    nunjucks_env.addFilter('displayValueForCol',function(displayTitleOverridesMap,col) {
   

        if (typeof displayTitleOverridesMap !== 'undefined' && displayTitleOverridesMap[col]) {
            return displayTitleOverridesMap[col]
        } else {
            return col;
        }

    })

    nunjucks_env.addFilter('isObjectEmpty', function (obj) {
        if (typeof obj == 'undefined' || obj == null) {
            return true;
        }
        return Object.keys(obj).length === 0;
    });
    nunjucks_env.addFilter('alphaSortedArray', function (array) {
        return array.sort();
    });
    nunjucks_env.addFilter('filterCount', function (array) {
        if (Array.isArray(array)) {
            return array.length;
        } else if (typeof array === 'string') {
            try {
                var obj = JSON.parse(array);
                if (Array.isArray(obj)) return obj.length;
            } catch (e) {
            }
        }
        return 1;
    });

    nunjucks_env.addFilter('doesNestedObjectContain',function(doc,nameWithDot,field) {
        if (typeof doc == "undefined" || doc == null) {
            return false;
        }

        var split_array = nameWithDot.split(".");
        var key = split_array[0];
        var nestedKey = split_array[1];
        if (doc[key] && doc[key][nestedKey] && doc[key][nestedKey] == field) {
            return true;
        }
        return false;
    })


    nunjucks_env.addFilter('colHasDataType',function(expectedDataType,col,coercionScheme) {
        col = col.replace(/\./g, "_");


        if (typeof coercionScheme[col] !== 'undefined' && coercionScheme[col].operation ) {
            var lowercase = coercionScheme[col].operation.toLowerCase();
            return lowercase.indexOf(expectedDataType.toLowerCase()) >= 0;
        }
        return false;
    })
    nunjucks_env.addFilter('castArrayToStringSeparatedByComma',function(array) {
        if (Array.isArray(array)) {
            var indexOfNullType = array.indexOf(null);
     
            if (indexOfNullType >= 0) {
                array.splice(indexOfNullType,1);
            }
        
            return array.toString()
        }
    })

    nunjucks_env.addFilter('finalizeColumnName', function(colName) {
        if (!colName) return '';
        return colName.replace(/\./g, "_");
    });
    
    // Array views - Filter obj construction
    nunjucks_env.addFilter('constructedFilterObj', function (existing_filterObj, this_filterCol, this_filterVal, isThisAnActiveFilter, isMultiselectable) {
        var filterObj = {};
        var existing_filterCols = Object.keys(existing_filterObj);
        var existing_filterCols_length = existing_filterCols.length;
        for (var i = 0; i < existing_filterCols_length; i++) {
            var existing_filterCol = existing_filterCols[i];
            if (existing_filterCol == this_filterCol && !isMultiselectable) {
                continue; // never push other active values of this is filter col is already active
                // which means we never allow more than one filter on the same column at present
            }
            var existing_filterVals = existing_filterObj[existing_filterCol];
            if (typeof existing_filterVals === 'number' || typeof existing_filterVals === 'string') {
                filterObj[existing_filterCol] = existing_filterVals; // as it's not set yet
            } else {
                filterObj[existing_filterCol] = JSON.parse(JSON.stringify(existing_filterVals)); // clone
            }
        }
        //
        if (isThisAnActiveFilter === false) { // do not push if active, since we'd want the effect of unsetting it
            var filterVals = filterObj[this_filterCol] || [];
            if (Array.isArray(filterVals) && (filterVals.indexOf(this_filterVal) == -1 || filterVals.indexOf(parseInt(this_filterVal)) == -1)) {
                filterVals.push(this_filterVal);
                filterObj[this_filterCol] = filterVals.length == 1 ? filterVals[0] : filterVals;
            } else if (typeof filterObj[this_filterCol] === 'string' && filterObj[this_filterCol] != this_filterVal) {
                var originalVal = filterObj[this_filterCol];
                filterObj[this_filterCol] = this_filterVal;
                if (isMultiselectable) {
                    try {
                        var obj = JSON.parse(originalVal);
                    } catch (e) {
                    }
                    if (Array.isArray(obj)) {
                        obj.push(this_filterVal);
                        filterObj[this_filterCol] = JSON.stringify(obj);
                    } else {
                        filterObj[this_filterCol] = JSON.stringify(['' + originalVal, '' + this_filterVal]);
                    }
                }
            } else {
                filterObj[this_filterCol] = this_filterVal;
            }
        } else if (isMultiselectable) {
            try {
                filterVals = JSON.parse(filterObj[this_filterCol]);
            } catch (e) {
            }
            if (Array.isArray(filterVals)) {
                if (filterVals.indexOf(this_filterVal) !== -1) {
                    var index = filterVals.indexOf(this_filterVal);
                    filterVals.splice(index, 1);

                    if (filterVals.length > 1)
                        filterObj[this_filterCol] = JSON.stringify(filterVals);
                    else if (filterVals.length == 1)
                        filterObj[this_filterCol] = filterVals[0];
                } else if (filterVals.indexOf(parseInt(this_filterVal)) !== -1) {
                    var index = filterVals.indexOf(parseInt(this_filterVal));
                    filterVals.splice(index, 1);

                    if (filterVals.length > 1)
                        filterObj[this_filterCol] = JSON.stringify(filterVals);
                    else if (filterVals.length == 1)
                        filterObj[this_filterCol] = filterVals[0];
                }
            } else if (this_filterVal == '' + filterObj[this_filterCol]) {
                delete filterObj[this_filterCol];
            }
        }
        //
        return filterObj;
    });
    // Array views - Filter value to display
    nunjucks_env.addFilter('filterValToDisplay', function (filterVal) {
        if (typeof filterVal === 'string') {
            var _filterVal = decodeURIComponent(filterVal);
            try {
                filterVal = JSON.parse(_filterVal);
            } catch (e) {
                return _filterVal;
            }
            if (typeof filterVal === 'number' || typeof filterVal === 'string') return filterVal;
        }
        var output = output + '';
        if (!isNaN(filterVal.min))
            output = filterVal.min + ' – ';
        else if (filterVal.min)
            output = output + moment(filterVal.min).utc().format("MMMM Do, YYYY") + ' – ';

        if (!isNaN(filterVal.max))
            output = output + filterVal.max;
        else if (filterVal.max)
            output = output + moment(filterVal.max).utc().format("MMMM Do, YYYY");

        if (Array.isArray(filterVal)) {
            for (var i = 0; i < filterVal.length; i++) {
                if (i != 0) output += ', ';
                output += filterVal[i];
            }
        }
        return output;
    });
    // Array views - Filters for bubbles
    nunjucks_env.addFilter('filterValuesForBubble', function (filterVal) {
        if (Array.isArray(filterVal)) {
            return filterVal;
        } else if (typeof filterVal === 'string') {
            try {
                var vals = JSON.parse(filterVal);
                if (Array.isArray(vals))
                    return vals;
            } catch (e) {
            }
            return [filterVal];
        } else {
            return [filterVal];
        }
    });
    // Array views - Filter route path
    nunjucks_env.addFilter('constructedRoutePath', function (routePath_base, filterObj, queryObj) {
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
                if (Array.isArray(_queryObj[key])) {
                    var subArray = _queryObj[key];
                    for (var i = 0; i < subArray.length; i++)
                        if (typeof subArray[i] === 'string')
                            routePath += '&' + key + '=' + subArray[i];
                        else
                            routePath += '&' + key + '=';
                } else {
                    routePath += '&' + key + '=' + _queryObj[key];
                }
            }

        if (routePath == '') return routePath_base;

        var joinChar = routePath_base.indexOf('?') !== -1 ? '&' : '?';
        return routePath_base + joinChar + routePath.substr(1);
    });
    // Object detail view - Detect/substitute the url string in the parameter with the wrapped a tag
    nunjucks_env.addFilter('substitutePlainURLs', function (str) {

        return str.toString().split(/[\s]+/).map(function (el) {
            var result = url.parse(el);
            if ((result.protocol == 'http:' || result.protocol == 'https:')
                && result.hostname != null && result.hostname != '') {
                return "<a href='" + el + "' target='blank'>" + el + "</a>";
            } else {
                return el;
            }
        }).join(' ');
    });

    nunjucks_env.addFilter('splitSubdomain',function(srcDocPKey) {
        var i = srcDocPKey.indexOf('-');
        var substring = srcDocPKey.substring(i+1,srcDocPKey.length);
        return substring;
    })

    // Object Row Coercion Data Type
    nunjucks_env.addFilter('fieldDataType_coercion_toString', function(field) {
        return datatypes.fieldDataType_coercion_toString(field);
    });

    var protocol =  env.USE_SSL === 'true' ? 'https://' : 'http://';
    var host = env.HOST? env.HOST: 'localhost:9080';

    nunjucks_env.addGlobal('siteBaseURL',protocol + host);

    nunjucks_env.addGlobal('explore_url', protocol + 'explore.' + host);


    nunjucks_env.addGlobal('addSubdomain', function(strSubdomain) {
        var siteBaseUrl = nunjucks_env.getGlobal('siteBaseURL');

        if (!siteBaseUrl) return '/team/' + strSubdomain;
        var result = url.parse(siteBaseUrl);
        var urlParts = result.host.replace('www.', '');
        urlParts = [strSubdomain].concat(urlParts);
        return result.protocol + '//' + urlParts.join('.');
    });
};