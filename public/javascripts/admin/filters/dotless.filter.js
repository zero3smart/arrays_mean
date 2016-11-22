angular.module('arraysApp')
    .filter('dotless', function () {
        return function (input) {
            if (input) {
                return input.replace(/\./g, '_');
            }
        }
    });