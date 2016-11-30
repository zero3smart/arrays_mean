angular
    .module('arraysApp')
    .controller('AdminCtrl', ['$scope', '$state', 'AuthService', '$window',
        function ($scope, $state, AuthService,$window) {



            $scope.user = AuthService.currentUser();
            $scope.userRole = AuthService.currentUserRole();
            
            $scope.logout = function() {
                AuthService.logout();
            }

        }]);