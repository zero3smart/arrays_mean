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

	signupModule.controller('signupCtrl',['$scope','$stateParams','User','$state','$location','env',function($scope,$stateParams,User,$state,
		$location,env) {

		$scope.env = env;

		var userId = $stateParams.id;
		$scope.invitedUser = false;
		$scope.showPasswordToolTip = false;
		$scope.user = User.get({id:userId},function() {


			if (!$scope.user._team || $scope.user._team.length == 0){
				$scope.user._team = {};
			} else {
				$scope.infoForm.subdomain.$setValidity('subdomainAvailable',false);
				$scope.invitedUser = true;
				$scope.user._team = $scope.user._team[0];
			}
		});

		$scope.registerUser = function() {
			User.update({id:$scope.user._id},$scope.user)
			.$promise
			.then(function(data) {
				if ($scope.invitedUser) {
					$state.go('signup.success',{isInvite: true,id:null});
				} else { 
					if ($scope.user.activated) {
						$state.go('signup.success',{isInvite: true,id:null});
					} else {
						$state.go('signup.success',{isInvite: false,id:data._id});
					}
				}
			},function(err) {

			})

		}

	}])

	signupModule.controller('successCtrl',['$scope','$stateParams','$window',function($scope,$stateParams,$window) {
		$scope.isInvite = $stateParams.isInvite;
		if (!$scope.isInvite) {
			var userId = $stateParams.id;
			$scope.resendActivationLink = '/api/user/' + userId + '/resend?emailType=activation';
		}
		$scope.login = function() {
			$window.location.href = 'auth/login';
		}
		
	}])

	signupModule.controller('errorCtrl',['$scope','$stateParams','$window',function($scope,$stateParams,$window) {

		$scope.error = $stateParams.name;
		$scope.message = $stateParams.msg;
		$scope.login = function() {
			$window.location.href = 'auth/login';
			

		}

	}])

	

})();