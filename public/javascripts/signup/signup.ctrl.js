(function() {
	var signupModule = angular.module('signupModule');



	signupModule.controller('mainCtrl',['$scope','User','$state', function($scope,User,$state){
		$scope.user = {};
		$scope.success = false;

		$scope.createUser = function() {
			if (!$scope.user.provider) {
				$scope.user.provider = 'local';
			}
			if ($scope.user._id) {
				$state.go('signup.personalinfo',{id: $scope.user._id});
			} else {
				var user = new User($scope.user);
				user.$save(function(user) {
					$scope.success = true;
					// $state.go('signup.personalinfo',{id: user._id});
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

		

	}])

	

})();