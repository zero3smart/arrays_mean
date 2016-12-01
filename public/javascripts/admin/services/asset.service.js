(function () {
    angular
        .module('arraysApp')
        .service('AssetService', AssetService);

    AssetService.$inject = ['$http', '$q'];
    function AssetService($http, $q) {

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

        return {
            loadIcons: loadIcons
         
        }
    }
})();