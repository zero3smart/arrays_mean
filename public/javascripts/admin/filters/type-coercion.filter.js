angular.module('arraysApp')
    .filter('typeCoercionToString', function () {
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