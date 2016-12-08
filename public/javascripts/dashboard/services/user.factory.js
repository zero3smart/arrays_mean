(function() {
	angular.module('arraysApp')
	.factory('User',function($resource) {

		return $resource('/api/user/:id',{id:'@_id'},{search:{'url':'/api/user/search', method:'GET',isArray:true},
			update:{method:'PUT'}});
	})
})();