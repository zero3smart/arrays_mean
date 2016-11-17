angular
    .module('arraysApp')
    .controller('AdminCtrl', ['$scope', 'AuthService',
        function ($scope, AuthService) {

            $scope.init = function () {
                $scope.user = AuthService.currentUser();
            };
        }]);