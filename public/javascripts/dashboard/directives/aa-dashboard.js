angular.module('arraysApp')
    .directive('aaToolbar', function() {
        return {
            restrict: 'E',
            scope: {
                title: '@title'
            },
            templateUrl: 'templates/blocks/dialog.toolbar.html'
        };
    })
    .directive('aaDialogActions', function() {
        return {
            restrict: 'E',
            scope: {
                confirm: '@confirm',
                warn: '@warn',
                cancel: '@cancel'
            },
            templateUrl: 'templates/blocks/dialog.actions.html'
        };
    })
    .directive('aaTooltip', function() {
        return {
            restrict: 'A',
            scope: {
                aaTooltip: '@'
            },
            transclude: true,
            template: '<span ng-transclude></span><md-tooltip md-delay="600">{{aaTooltip}}</md-tooltip>'
        };
    })
    .directive('aaColorPicker', function() {
        return {
            restrict: 'E',
            scope: {
                selected: '='
            },
            templateUrl: 'templates/blocks/colorpicker.html',
            link: function(scope) {
                scope.colors = [
                    '#FA2A00',
                    '#FEB600',
                    '#79F800',
                    '#005CFF',
                    '#FE00FF',
                    '#EF0069',
                    '#00DAE5',
                    '#009E9D',
                    '#7A00F6',
                    '#dddddd',
                    '#4A4A4A'
                ];
                scope.pick = function(color) {
                    scope.selected = color;
                };
                if(!scope.selected) { scope.selected = scope.colors[0]; }
            }
        };
    })
    .directive('aaMultiColorPicker', function() {
        return {
            restrict: 'E',
            scope: {
            },
            templateUrl: 'templates/blocks/multicolorpicker.html',
            link: function(scope) {
                scope.dummyColors = [];

                scope.addDummyColor = function() {
                    if (scope.dummyColors[scope.dummyColors.length - 1] !== '') {
                        scope.addingColor = true;
                        scope.dummyColors.push('');
                    }
                };
            }
        };
    });
