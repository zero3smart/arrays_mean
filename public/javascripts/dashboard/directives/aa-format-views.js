angular.module('arraysApp')
    .directive('aaViewConfigMenus', function() {
        return {
            restrict: 'E',
            scope: {
                title: '@title'
            },
            templateUrl: 'templates/blocks/views/config-menus.html'
        };
    });
