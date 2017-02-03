(function() {
    angular.module('arraysApp')
    .factory('Team',function($resource) {

        return $resource('/api/team/:id',{id:'@_id'},
        	{
        		search:{url:'/api/team/search', method:'GET',isArray:true},
				update:{method:'PUT'}, 
                query: {url: '/api/team',method: 'GET',isArray:true}, 
				switchAdmin: {url: '/api/team/admin/:id',method:'PUT'}, 
				delete: {url: '/api/team/:id',id:'@_id',method:'DELETE'}
			});

    })
})();





