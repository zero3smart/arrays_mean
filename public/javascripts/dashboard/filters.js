var app = angular.module('arraysApp');

app.filter('dotless', function () {
    return function (input) {
        if (input) {
            return input.replace(/\./g, '_');
        }
    }
});

app.filter('capitalize', function () {
    return function (input) {
        if (input != null)
            input = input.toLowerCase();
        return input.substring(0, 1).toUpperCase() + input.substring(1);
    }
});

app.filter('pluralize', function () {
    return function (input, singular, plural) {
        if (input === undefined) {
            return;
        }
        else if (input === 0) {
            return 'No ' + input + ' ' + plural;
        }
        else if (input === 1) {
            return input + ' ' + singular;
        }
        else {
            return input + ' ' + plural;
        }
    }
});

app.filter('typeCoercionToString', function () {
    return function (input) {
        if (!input) return 'String';

        var opName = input.operation;
        if (opName == 'ProxyExisting') {
            return 'Proxy';
        } else if (opName == 'ToDate') {
            return 'Date';
        } else if (opName == 'ToInteger') {
            return 'Integer';
        } else if (opName == 'ToFloat') {
            return 'Float';
        } else if (opName == 'ToStringTrim') {
            return 'String Trim';
        } else {
            return 'String'; // 'Unknown'
        }
    }
});

app.filter('viewToName',function() {
    return function(input) {
        return input.split(/(?=[A-Z])/).join("-").toLowerCase();
    }
})


app.filter('jobTask', function() {
    return function(input) {
        if (input == 'preImport') {
            return 'Import Raw Objects';
        } else if (input == 'importProcessed') {
            return 'Import Processed Objects';
        } else if (input == 'postImport') {
            return 'Caching unique filters';
        } else if (input == 'scrapeImages') {
            return 'Image Scraping';
        }
    }
})

app.filter('omit',function() {
    return function(input,keyName) {
        var copy = angular.copy(input);
        delete copy[keyName];
        return copy;
    }
})
