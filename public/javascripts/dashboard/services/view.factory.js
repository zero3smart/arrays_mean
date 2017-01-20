(function() {
	angular.module('arraysApp')
		.factory('View',function($resource) {
		return $resource('/api/view/',{},{
			'get': {
				url: '/api/view/:id'
			}

		});
	})
})();


