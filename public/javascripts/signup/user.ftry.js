(function() {
	var signupModule = angular.module('signupModule');
	signupModule.factory('UserFactory',function($http) {
		var factory = {};
		factory.getUserById = function(id) {
			$http.get('/api/user/'+ id)
				.success(function(data) {

					console.log(data);

				})
				.error(function(err) {

				})

		}



		return factory;

	})



	




})();


