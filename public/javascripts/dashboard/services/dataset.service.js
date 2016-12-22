(function () {
    angular
        .module('arraysApp')
        .service('DatasetService', DatasetService);

    DatasetService.$inject = ['$http', '$q'];
    function DatasetService($http, $q) {

        var getMappingDatasourceCols = function(pKey) {
            return $http.get('api/dataset/getMappingDatasourceCols/'+pKey)
        };

        var remove = function(id) {
            return $http.post('api/dataset/remove', {id: id});         
        };

        var get = function(id) {
            // New Dataset
            if (!id) return {
                urls: []
            };
           
            return $http.get('api/dataset/get/' + id)
            .then(function(response) {
                return response.data.dataset;
            });
        };

        var publish = function(id,isPublic) {
            var body = {
                id: id,
                isPublic: isPublic
            };
            return $http.put('api/dataset/publish',body)
        };

        var getAdditionalSources = function(id) {

            return $http.get('api/dataset/getAdditionalSources/' + id)
            .then(function(response) {
                return response.data.sources;
            }).catch(function(err) {
                console.log(err);
                return [];
            })
        };

        var save = function(dataset) {
            return $http.post('api/dataset/update', dataset)
        };


        var initializeToImport = function(uid) {
            return $http.post('api/dataset/initializeToImport', {uid: uid})
           
        };

        var preImport = function(uid) {
            return $http.post('api/dataset/preImport', {uid: uid})
        };

        var postImport = function(uid) {
            return $http.post('api/dataset/postImport', {uid: uid})
           
        };

        var getAvailableTypeCoercions = function() {
            return $http.get('api/dataset/getAvailableTypeCoercions')
            .then(function(response) {
                var data = response.data;
                return data.availableTypeCoercions;
            }).catch(function(err) {
                console.log(err);
                return [];
            })
        };

        var getAvailableDesignatedFields = function() {
            return $http.get('api/dataset/getAvailableDesignatedFields')
            .then(function(response) {
                var data = response.data;
                return data.availableDesignatedFields;
            }).catch(function(err) {
                console.log(err);
                return [];
            })
        };

        var getAvailableMatchFns = function() {
            return $http.get('api/dataset/getAvailableMatchFns')
            .then(function(response) {
               return response.data.availableMatchFns;
            }).catch(function(err) {
                console.log(err);
                return [];
            })

        };

        var getDatasetsWithQuery = function(query) {
            return $http.post('api/dataset/getDatasetsWithQuery',query)
            .then(function(response) {
                var data = response.data;
                 return data.datasets;
            }).catch(function(err) {
                console.log(err);
                return [];
            })
        };

       var removeSubdataset = function(id) {

           return $http.post('api/dataset/removeSubdataset', {id: id})
       };

        return {
            removeSubdataset: removeSubdataset,
            remove: remove,
            get: get,
            getAdditionalSources: getAdditionalSources,
            save: save,
            publish: publish,
            getAvailableTypeCoercions: getAvailableTypeCoercions,
            getAvailableDesignatedFields: getAvailableDesignatedFields,
            getAvailableMatchFns: getAvailableMatchFns,
            getDatasetsWithQuery: getDatasetsWithQuery,
            getMappingDatasourceCols: getMappingDatasourceCols,
            initializeToImport: initializeToImport,
            preImport: preImport,
            postImport: postImport
        }
    }
})();