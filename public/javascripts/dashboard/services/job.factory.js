(function() {
    angular.module('arraysApp')
    .factory('Job',function($resource) {

        return $resource('/api/job/:id',{id:'@_id'},{search:{url:'/api/job/search', method:'GET',isArray:true},
         getLog: {url: '/api/job/:id/log',method: 'GET',isArray:true}});

    })
})();





