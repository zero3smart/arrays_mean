(function() {
	var signupModule = angular.module('signupModule');
	signupModule.factory('User',function($resource) {

		return $resource('/api/user/:id',{id:'@_id'},{query:{'url':'/api/user/search'}});
	})


	signupModule.factory('Team',function($resource) {
		return $resource('/api/team/:id',{id:'@_id'}, {update:{method:'PUT'}});
	})





})();


