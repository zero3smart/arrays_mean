(function() {
    angular.module('arraysApp')
    .factory('Job',function($resource) {

        return $resource('/api/job/:id',{id:'@_id'},{
            getLog: {url: '/api/job/:id/log',method: 'GET',isArray:true},
            search:{url:'/api/job/search', method:'GET',isArray:true},
      		delete: {url: '/api/job/:id',method: 'DELETE'}
        });
    })
})();





