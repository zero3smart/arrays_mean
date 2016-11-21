(function() {
	var signupModule = angular.module('signupModule');
	signupModule.factory('User',function($resource) {

		return $resource('/api/user/:id',{id:'@_id'},{search:{'url':'/api/user/search', method:'GET',isArray:true},
			update:{method:'PUT'}});
	})


	signupModule.factory('Team',function($resource) {
	
		return $resource('/api/team/:id',{id:'@_id'},{search:{'url':'/api/team/search', method:'GET',isArray:true}});
	})





})();


