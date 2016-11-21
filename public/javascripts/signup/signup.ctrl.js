(function() {
	var signupModule = angular.module('signupModule');



	signupModule.controller('mainCtrl',['$scope','User','$state', function($scope,User,$state){
		$scope.user = {};


		$scope.createUser = function() {
			if (!$scope.user.provider) {
				$scope.user.provider = 'local';
			}

			if ($scope.user._id && !$scope.user._team) {
				$state.go('signup.info',{id: $scope.user._id});
				
			} else {
				var user = new User($scope.user);
				user.$save(function(user) {
					$state.go('signup.info',{id:user._id});
				});

			}
		}

	}])

	signupModule.controller('signupCtrl',['$scope','$stateParams','User','$state',function($scope,$stateParams,User,$state) {

		var userId = $stateParams.id;
		$scope.showPasswordToolTip = false;
		$scope.user = User.get({id:userId},function() {
			if (!$scope.user._team){
				$scope.user._team = {};
			}
		});


		$scope.registerUser = function() {
			User.update({id:$scope.user._id},$scope.user)
			.$promise
			.then(function() {

			})



		}

		

	}])

	

})();