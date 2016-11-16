(function () {
    angular
        .module('arraysApp')
        .service('dataset', dataset);

    dataset.$inject = ['$http', '$q'];
    function dataset($http, $q) {

        var getAll = function() {
            var deferred = $q.defer();
            $http.get('/api/dataset/getAll').then(function(response) {
                if (response.data && !response.data.error) {
                    return deferred.resolve(response.data.docs);
                } else {
                    return deferred.reject(response.data.error);
                }
            }, function(err) {
                return deferred.reject(response.data.error);
            });
            return deferred.promise;
        }

        return {
            getAll: getAll
        }
    }
})();