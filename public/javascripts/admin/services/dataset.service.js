(function () {
    angular
        .module('arraysApp')
        .service('DatasetService', DatasetService);

    DatasetService.$inject = ['$http', '$q'];
    function DatasetService($http, $q) {

        var GetAll = function() {
            var deferred = $q.defer();
            $http.get('/api/dataset/getAll').then(function(response) {
                if (response.data && !response.data.error) {
                    return deferred.resolve(response.data.datasets);
                } else {
                    return deferred.reject(response.data.error);
                }
            }, function(err) {
                return deferred.reject(response.data.error);
            });
            return deferred.promise;
        }

        return {
            GetAll: GetAll
        }
    }
})();