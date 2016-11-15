(function () {
    angular
        .module('arraysApp')
        .service('authentication', authentication);

    authentication.$inject = ['$http', '$window', '$q'];
    function authentication ($http, $window, $q) {

        var isLoggedIn = function() {
            return $window.user ? true : false;
        };

        var currentUser = function() {
            if (!isLoggedIn()) return null;
            return $window.user;
        };

        var updateProfile = function(user) {
            var deferred = $q.defer();
            if (isLoggedIn()) {
                $http.post('/api/account/update', user).then(function(data) {
                    if (!data.error) {
                        // Update User
                        if (!$window.user._json.user_metadata) $window.user._json.user_metadata = {};
                        if (!$window.user._json.user_metadata.name) $window.user._json.user_metadata.name = {};

                        $window.user._json.user_metadata.name.givenName = user.givenName;
                        $window.user._json.user_metadata.name.familyName = user.familyName;

                        return deferred.resolve(data.message);
                    } else {
                        return deferred.reject(data.error);
                    }
                }, function(err) {
                    return deferred.reject(data.error);
                });
            } else {
                return deferred.reject('You need to login first!');
            }
            return deferred.promise;
        };

        return {
            currentUser : currentUser,
            isLoggedIn : isLoggedIn,
            updateProfile: updateProfile
        };
    }


})();