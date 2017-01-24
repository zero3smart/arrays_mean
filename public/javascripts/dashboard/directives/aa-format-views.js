angular.module('arraysApp')
    .directive('aaViewDefaultSortOrder', function() {
        return {
            restrict: 'E',
            scope: {
                // title: '@title'
            },
            templateUrl: 'templates/blocks/views/default-sort-order.html'
        };
    })
    .directive('aaViewConfigMenus', function() {
        return {
            restrict: 'E',
            scope: {
                // title: '@title'
            },
            templateUrl: 'templates/blocks/views/config-menus.html'
        };
    });
