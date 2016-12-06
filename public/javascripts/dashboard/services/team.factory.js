(function() {
    angular.module('arraysApp')
    .factory('Team',function($resource) {

        return $resource('/api/team/:id',{id:'@_id'},{update:{method:'PUT'}});
    })
})();


