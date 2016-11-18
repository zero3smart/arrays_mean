(function() {
	var signupModule = angular.module('signupModule');



	signupModule.controller('mainCtrl',[, function(){

		$scope.createUser = function(isValid) {

		}

	}])

	signupModule.controller('signupCtrl',['$scope','$state','UserFactory',function($scope,$state,UserFactory) {
		$scope.user = $scope.user || {};


		$scope.submitForm = function(isValid,nextState) {
			if (isValid) {
				$state.go(nextState);
			}

		}

	}])

	

})();