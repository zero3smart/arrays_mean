angular
    .module('arraysApp')
    .controller('AdminCtrl', ['$scope', '$state', 'AuthService',
        function ($scope, $state, AuthService) {

        


             $scope.user = AuthService.currentUser();
        }]);