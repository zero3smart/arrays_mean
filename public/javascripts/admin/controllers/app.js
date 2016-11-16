angular
    .module('arraysApp')
    .controller('adminCtrl', ['$scope', 'authentication',
    function($scope, authentication) {

        $scope.init = function() {
            $scope.user = authentication.currentUser();
        };
    }]);