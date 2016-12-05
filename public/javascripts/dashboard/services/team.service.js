(function () {
    angular
        .module('arraysApp')
        .service('TeamService', TeamService);

    DatasetService.$inject = ['$http', '$q'];
    function TeamService($http, $q) {

      
        var save = function(dataset) {
            var deferred = $q.defer();
            $http.post('api/team/update', dataset)
                .success(function(data) {
                    if (!data.error && data.id) {
                        return deferred.resolve(data.id);
                    } else {
                        return deferred.reject(data.error);
                    }
                })
                .error(deferred.reject);
            return deferred.promise;
        };


     

        return {
          
            save: save
           
        }
    }
})();