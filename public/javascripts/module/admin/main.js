'use strict';

angular
    .module('arraysApp', [
    'ui.router',
    'oc.lazyLoad',
    'ngStorage',
    'ngMaterial',
    'ngMessages',
    'ngAria',
])
    .controller('adminCtrl', ['$scope', '$localStorage', '$window', 'authentication',
    function($scope, $localStorage, $window, authentication) {

        $scope.init = function() {
            $scope.user = authentication.currentUser();
        };
    }]);

