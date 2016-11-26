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

app.filter('typeCoercionToString', function () {
    return function (input) {
        if (input) {
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
    }
});

