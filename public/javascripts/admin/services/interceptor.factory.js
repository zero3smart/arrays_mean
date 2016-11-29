(function() {
	angular.module('arraysApp')
		.factory('TokenInterceptor',function($q,$window,
			AuthService) {
		return {
			request: function(config) {

				if (config.url.indexOf("api") >= 0) {
					var token = AuthService.getToken();
					if (token) {
						config.headers.Authorization = 'Bearer ' + token;
					}

				}
				return config;
			},

			responseError : function(rejectedResponse) {


				//ToDO: revoke token 





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


