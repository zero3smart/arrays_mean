(function() {
	var signupModule = angular.module('signupModule');



	signupModule.controller('mainCtrl',['$scope','User','$state', function($scope,User,$state){
		$scope.user = {};
		$scope.success = false;
		$scope.resend = false;

		$scope.createUser = function() {
			if (!$scope.user.provider) {
				$scope.user.provider = 'local';
			}
			if ($scope.user._id) { //
				if ($scope.user.provider == 'local') { 
					$scope.resend = true;
				} else {
					$state.go('signup.teaminfo',{id: $scope.user._id});
				}
			} else {
				var user = new User($scope.user);
				user.$save(function(user) {
					$scope.success = true;
				});
			}
			

		}

	}])

	signupModule.controller('signupCtrl',['$scope','$stateParams','User','$state',function($scope,$stateParams,User,$state) {

		var userId = $stateParams.id;
		
		$scope.user = User.get({id:userId},function() {
			if ($scope.user.provider !== 'local') {
				$state.go('signup.teaminfo',{id:$scope.user._id});
			} 

		});


		$scope.createTeam = function() {
			
		}

		

	}])

	

})();