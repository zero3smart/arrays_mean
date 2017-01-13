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
    .directive('aaTooltip', function(){
        return {
            restrict: 'A',
            transclude: true,
            template: '<span ng-transclude></span><md-tooltip md-delay="300">{{toolTipText()}}</md-tooltip>',
            link: function(scope, element, attr) {
                scope.toolTipText = function() { return attr.aaTooltip; }
            }
        };
    });
