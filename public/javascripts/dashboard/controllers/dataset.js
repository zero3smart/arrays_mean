angular.module('arraysApp')
    .controller('DatasetCtrl', ['$scope', '$location',
        function($scope, $location) {

        	 $scope.team = AuthService.currentTeam();
        	

        }]
    );