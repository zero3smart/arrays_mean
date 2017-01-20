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
    .directive("aaTooltip", function() {
      return {
        scope: { aaTooltip: '@'},
        restrict: 'A',
        transclude: true,
        template: '<span ng-transclude></span><md-tooltip md-delay="600">{{aaTooltip}}</md-tooltip>'
      };
    });
