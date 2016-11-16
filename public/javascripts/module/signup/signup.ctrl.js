(function() {
	var signupModule = angular.module('signupModule');

	signupModule.controller('signupCtrl',['$scope','$state','$stateParams',function($scope,$state,$stateParams) {
		console.log($scope.user);

		$scope.submitForm = function(isValid,nextState) {

			

			if (isValid) {
				$state.go(nextState,{user:$scope.user});

			}

		}

	


		

		

	}])
})();