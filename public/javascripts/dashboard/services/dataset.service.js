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

        var update = function(id,update) {
            return $http.put('api/dataset/update/'+ id, update);
        }

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

        var search = function(queryObj) {
            var formURL = "";
            var first = true;
            for (var obj in queryObj) {
                if (first) {
                    formURL += '?';
                    first = false;
                } else {
                   formURL += '&'

                }
                formURL += obj + '=' + queryObj[obj];
            }

            return $http.get('api/dataset' + formURL);
        }

 
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
            return $http.post('api/dataset/save', dataset)
        };

        var deleteSource = function(id) {
            return $http.delete('api/dataset/source/' + id);
        }

        var preImport = function(id) {
            return $http.get('api/dataset/preImport/' + id);
        };

        var scrapeImages = function(id) {
            return $http.get('api/dataset/scrapeImages/' + id);
        }

        var importProcessed = function(id) {
            return $http.get('api/dataset/importProcessed/' + id);
        }

        var postImport = function(id) {
            return $http.get('api/dataset/postImport/' + id)
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

        var getJobStatus = function(id) {
            return $http.get('api/dataset/jobStatus/' + id)
            .then(function(response) {

                return response.data;
            })
        }

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

       var getReimportDatasets = function(id) {
    
            return $http.get('api/dataset/reimportDatasets/' + id)
            .then(function(response) {
                var data = response.data;
                return data.datasets;
            }).catch(function(err) {
                console.log(err);
                return [];
            })
       }
       var killJob = function(id) {
            return $http.delete('api/dataset/job/' + id);
       }

       var connectToRemoteDatasource = function(datasetId,connectionInfo) {
            return $http.post('api/dataset/connect/' + datasetId,connectionInfo);
       }

       var colsForJoinTables = function(datasetId,connectionInfo) {
            return $http.post('api/dataset/colsForJoinTables/' + datasetId ,connectionInfo);
       }




        return {
            removeSubdataset: removeSubdataset,
            deleteSource: deleteSource,
            remove: remove,
            get: get,
            connectToRemoteDatasource: connectToRemoteDatasource,
            killJob: killJob,
            search: search,
            colsForJoinTables:colsForJoinTables,
            getAdditionalSources: getAdditionalSources,
            getReimportDatasets: getReimportDatasets,
            save: save,
            update: update,
            getJobStatus: getJobStatus,
            getAvailableTypeCoercions: getAvailableTypeCoercions,
            getAvailableDesignatedFields: getAvailableDesignatedFields,
            getAvailableMatchFns: getAvailableMatchFns,
            getDatasetsWithQuery: getDatasetsWithQuery,
            getMappingDatasourceCols: getMappingDatasourceCols,
            preImport: preImport,
            postImport: postImport,
            scrapeImages: scrapeImages,
            importProcessed: importProcessed
        }
    }
})();