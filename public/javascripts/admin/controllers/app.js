angular
    .module('arraysApp')
    .controller('AdminCtrl', ['$scope', '$state', 'AuthService', '$window',
        function ($scope, $state, AuthService,$window) {

        


            $scope.user = AuthService.currentUser();
            if ($scope.user == null) {
                 $window.location.href = '/auth/login';
            }

        }]);