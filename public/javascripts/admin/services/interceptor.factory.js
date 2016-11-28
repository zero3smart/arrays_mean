(function() {
	angular.module('arraysApp')
		.factory('TokenInterceptor',function($q,$window,$location,
			AuthService) {
		return {
			requestError: function(rejection) {
				if (rejection != null && rejection.status == 401 &&
					(AuthService.isLoggedIn())) {
					delete $window.sessionStorage.user;
					$location.path('/auth/login');
				}
				return $q.reject(rejection);

			},
			response: function(response) {
				return response || $q.when(response);
			}
		}
	})
})();


