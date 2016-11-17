angular
    .module('arraysApp')
    .controller('AdminCtrl', ['$scope', '$state', 'AuthService',
        function ($scope, $state, AuthService) {

            $scope.init = function () {
                $scope.user = AuthService.currentUser();
            };
        }]);