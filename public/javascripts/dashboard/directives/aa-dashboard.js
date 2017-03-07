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
                selected: '=',
                unlist: '=?' // optional
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
                    '#707070'
                ];

                scope.unlist = scope.unlist || [];

                scope.pick = function(color) {
                    scope.selected = color;
                };
                // if(!scope.selected) { scope.selected = scope.colors[0]; } // do not set default
            }
        };
    })
    .directive('aaMultiColorPicker', function() {
        return {
            restrict: 'E',
            scope: {
                colors: '='
            },
            templateUrl: 'templates/blocks/multicolorpicker.html',
            link: function(scope) {
                scope.addColor = function() {
                    if (scope.colors[scope.colors.length - 1] !== '') {
                        scope.colors.push('');
                    }
                };
                scope.removeColor = function(ndex) {
                    scope.colors.splice(ndex,1);
                };
            }
        };
    })
    .directive('aaResetValidityOnChange', function() {
        return {
            restrict: 'A',
            require: 'ngModel',
            link: function(scope, element, attrs, ngModelCtrl) {
                ngModelCtrl.$viewChangeListeners.push(function() {
                    ngModelCtrl.$setValidity(attrs['aaResetValidityOnChange'], true);
                });
            }
        };
    });
