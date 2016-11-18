(function () {
    angular
        .module('arraysApp')
        .service('DatasetService', DatasetService);

    DatasetService.$inject = ['$http', '$q'];
    function DatasetService($http, $q) {

        var getAll = function() {
            var deferred = $q.defer();
            $http.get('/api/dataset/getAll')
                .success(function(data) {
                    if (!data.error) {
                        return deferred.resolve(data.datasets);
                    } else {
                        return deferred.reject(data.error);
                    }
                })
                .error(function(data) {
                    return deferred.reject(data);
                });
            return deferred.promise;
        };

        var remove = function(id) {
            var deferred = $q.defer();
            $http.post('api/dataset/remove', {id: id})
                .success(function(data) {
                    if (!data.error) {
                        return deferred.resolve(true);
                    } else {
                        return deferred.reject(data.error);
                    }
                })
                .error(function(data) {
                    return deferred.reject(data)
                });
            return deferred.promise;
        };

        var get = function(id) {
            // New Dataset
            if (!id) return {
                urls: []
            };

            var deferred = $q.defer();
            $http.get('api/dataset/get/' + id)
                .success(function(data) {
                    if (!data.error) {
                        return deferred.resolve(data.dataset);
                    } else {
                        return deferred.reject(data.error);
                    }
                })
                .error(function(data) {
                    return deferred.reject(data);
                });
            return deferred.promise;
        };

        var save = function(dataset) {

        };

        return {
            getAll: getAll,
            remove: remove,
            get: get,
            save: save,
        }
    }
})();