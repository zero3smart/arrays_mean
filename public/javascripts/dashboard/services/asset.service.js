(function () {
    angular
        .module('arraysApp')
        .service('AssetService', AssetService);

    AssetService.$inject = ['$http', '$q'];
    function AssetService($http, $q) {

        var deleteImage = function(id, key) {
            var deferred = $q.defer();
            $http.get('api/team/deleteImage/' + id + key)
                .success(function (data) {
                    if(!data.error) {
                        return deferred.resolve(data);
                    } else {
                        return deferred.reject(data.error);
                    }
                })
                .error(deferred.reject);
            return deferred.promise
        }

        var loadIcons = function() {
            var deferred = $q.defer();
            $http.get('/api/team/loadIcons')
                .success(function(data) {
                    if (!data.error) {
                        return deferred.resolve(data.iconsUrl);
                    } else {
                        return deferred.reject(data.error);
                    }
                })
                .error(deferred.reject);
            return deferred.promise;
        };

        var getPutUrlForTeamAssets = function(id,fileType,assetType,fileName) {

            var deferred = $q.defer();
            $http.get('api/team/getAssetUploadSignedUrl/'+ id + '?fileType='+fileType + '&assetType=' + assetType + '&fileName='+fileName)
                .success(function(data) {
                   if (data.putUrl && data.publicUrl) {
                        return deferred.resolve(data);
                   } else {
                        return deferred.reject();
                   }
                })
                .error(deferred.reject)
            return deferred.promise;
        }
        //toDo: move getputPutUrlfor dataset assets here.

        var getPutUrlForDatasetAssets = function(id,fileType,fileName) {
            var deferred = $q.defer();
            $http.get('api/dataset/getAssetUploadSignedUrl/'+ id + '?fileType='+fileType + '&fileName='+fileName)
                .success(function(data) {
                   if (data.putUrl && data.publicUrl) {
                        return deferred.resolve(data);
                   } else {
                        return deferred.reject();
                   }

                })
                .error(deferred.reject)
            return deferred.promise;

        }






        return {
            loadIcons: loadIcons,
            getPutUrlForTeamAssets: getPutUrlForTeamAssets,
            getPutUrlForDatasetAssets : getPutUrlForDatasetAssets,
            deleteImage: deleteImage 
         
        }
    }
})();