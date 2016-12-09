(function () {
    angular
        .module('arraysApp')
        .service('DatasetService', DatasetService);

    DatasetService.$inject = ['$http', '$q'];
    function DatasetService($http, $q) {

        var getAll = function(TeamId) {
            var deferred = $q.defer();
            $http.get('/api/dataset/getAll/'+ TeamId)
                .success(function(data) {
                    if (!data.error) {
                        return deferred.resolve(data.datasets);
                    } else {
                        return deferred.reject(data.error);
                    }
                })
                .error(deferred.reject);
            return deferred.promise;
        };

        var getMappingDatasourceCols = function(pKey) {
            var deferred = $q.defer();
            $http.get('api/dataset/getMappingDatasourceCols/'+pKey)
                .success(function(data) {
                    return deferred.resolve(data.cols);
                })
                .error(deferred.reject);
            return deferred.promise;
        };

        var remove = function(id) {
            var deferred = $q.defer();
            $http.post('api/dataset/remove', {id: id})
                .success(function(data) {
                    if (!data.error && data.success == 'ok') {
                        return deferred.resolve(true);
                    } else {
                        return deferred.reject(data.error);
                    }
                })
                .error(deferred.reject);
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
                    if (!data.error && data.dataset) {
                        return deferred.resolve(data.dataset);
                    } else {
                        return deferred.reject(data.error);
                    }
                })
                .error(deferred.reject);
            return deferred.promise;
        };

        var publish = function(id,isPublished) {


            var deferred = $q.defer();
            var body = {
                id: id,
                isPublished: isPublished
            }
            $http.put('api/dataset/publish',body)
                .success(function(data) {
                    console.log(data);

                     if (!data.error && data.dataset) {
                        return deferred.resolve(data.dataset);
                    } else {
                        return deferred.reject(data.error);
                    }
                })
                .error(function(err) {
                    console.log(err);
                });
            return deferred.promise;
        }

        var getSources = function(id) {
            var deferred = $q.defer();
            $http.get('api/dataset/getSources/' + id)
                .success(function(data) {
                    if (!data.error && data.sources) {
                        return deferred.resolve(data.sources);
                    } else {
                        return deferred.reject(data.error);
                    }
                })
                .error(deferred.reject);
            return deferred.promise;
        };

        var save = function(dataset) {
            var deferred = $q.defer();
            $http.post('api/dataset/update', dataset)
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


        var initializeToImport = function(uid) {
            var deferred = $q.defer();
            $http.post('api/dataset/initializeToImport', {uid: uid})
                .success(function(data) {
                    if (!data.error && data.uid) {
                        return deferred.resolve(data.uid);
                    } else {
                        return deferred.reject(data.error);
                    }
                })
                .error(deferred.reject);
            return deferred.promise;
        };

        var preImport = function(uid) {
            var deferred = $q.defer();
            $http.post('api/dataset/preImport', {uid: uid})
                .success(function(data) {
                    if (!data.error && data.uid) {
                        return deferred.resolve(data.uid);
                    } else {
                        return deferred.reject(data.error);
                    }
                })
                .error(deferred.reject);
            return deferred.promise;
        };

        var postImport = function(uid) {
            var deferred = $q.defer();
            $http.post('api/dataset/postImport', {uid: uid})
                .success(function(data) {
                    if (!data.error && data.dataset) {
                        return deferred.resolve(data.dataset);
                    } else {
                        return deferred.reject(data.error);
                    }
                })
                .error(deferred.reject);
            return deferred.promise;
        };

        var getAvailableTypeCoercions = function() {
            var deferred = $q.defer();
            $http.get('api/dataset/getAvailableTypeCoercions')
                .success(function(data) {
                    if (!data.error && data.availableTypeCoercions)
                        return deferred.resolve(data.availableTypeCoercions);
                    else
                        return deferred.reject(data.error);
                })
                .error(deferred.reject);
            return deferred.promise;
        };

        var getAvailableDesignatedFields = function() {
            var deferred = $q.defer();
            $http.get('api/dataset/getAvailableDesignatedFields')
                .success(function(data) {
                    if (!data.error && data.availableDesignatedFields)
                        return deferred.resolve(data.availableDesignatedFields);
                    else
                        return deferred.reject(data.error);
                })
                .error(deferred.reject);
            return deferred.promise;
        };

       

        return {
            getAll: getAll,
            remove: remove,
            get: get,
            getSources: getSources,
            save: save,
            publish: publish,
            getAvailableTypeCoercions: getAvailableTypeCoercions,
            getAvailableDesignatedFields: getAvailableDesignatedFields,
            getMappingDatasourceCols: getMappingDatasourceCols,
            initializeToImport: initializeToImport,
            preImport: preImport,
            postImport: postImport
        }
    }
})();