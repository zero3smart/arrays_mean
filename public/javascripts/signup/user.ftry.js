(function() {
	var signupModule = angular.module('signupModule');
	signupModule.factory('User',function($resource) {

		return $resource('/api/user/:id',{id:'@_id'},{update:{method:'PUT'}});
	})





})();


