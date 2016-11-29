(function() {
	angular.module('arraysApp')
		.factory('TokenInterceptor',function($q,$window,$injector) {
		return {
			request: function(config) {

				if (config.url.indexOf("api") >= 0 && config.url.indexOf('currentUser') == -1) {
					var token = $injector.get('AuthService').getToken();
					if (token) {
						config.headers.Authorization = 'Bearer ' + token;
					}

				}
				return config;
			},

			responseError : function(rejectedResponse) {

				if (rejectedResponse.status == 401) {
					$window.location.href= "/auth/login";
				}
				return rejectedResponse;

			},
			response: function(response) {


				return response || $q.when(response);
			}
		}
	})
})();


