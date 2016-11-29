(function () {
    angular
        .module('arraysApp')
        .service('AuthService', AuthService);

    AuthService.$inject = [ '$window', '$q'];
    function AuthService ( $window, $q) {

     

        var isLoggedIn = function() {
            return $window.sessionStorage.user? true: false
        };

        var getToken = function() {
            var user = currentUser();
            if (user) {
                return user.authToken;
            } 
            return null;
            
        }

        // This method will be used by UI-Router resolves
        var ensureLogin = function() {
            var deferred = $q.defer();
            if (isLoggedIn()) {
                deferred.resolve(true);
            } else {
                deferred.resolve(false);
                window.location = '/auth/login';
            }
            return deferred.promise();
        };

        var currentUser = function() {
            if (!isLoggedIn()) return null;
            return JSON.parse($window.sessionStorage.user);
        };


        //ToDo: modify, using $http-> ciricular dependency, maybe using fac.
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
            ensureLogin : ensureLogin,
            updateProfile: updateProfile,
            getToken : getToken
        };
    }


})();