(function () {
    angular
        .module('arraysApp')
        .service('dataset', dataset);

    dataset.$inject = ['$http', '$q'];
    function dataset($http, $q) {

        var getAll = function() {
            var deferred = $q.defer();
            $http.get('/api/dataset/getAll').then(function(data) {
                if (!data.error) {
                    return deferred.resolve(data.docs, data.message);
                } else {
                    return deferred.reject(data.error);
                }
            }, function(err) {
                return deferred.reject(data.error);
            });
            return deferred.promise;
        }

        return {
            getAll: getAll
        }
    }
})();