(function () {
    angular
        .module('arraysApp')
        .service('AuthService', AuthService);

    AuthService.$inject = [ '$window', '$q','$http'];
    function AuthService ( $window, $q,$http) { 
     
        var isLoggedIn = false;

        if (!$window.sessionStorage.user) {
            $http.get('/api/user/currentUser')
            .then(function(result) {

                console.log(result);

                var userData = result.data;
                console.log(userData);
                if (userData) {
                    isLoggedIn = true;
                    $window.sessionStorage.setItem('user',JSON.stringify(userData));
                } 
            })
        } else {
            isLoggedIn = true;
        }

        var getToken = function() {
            var user = currentUser();
            if (user) {
                return user.authToken;
            } 
            return null;
        }


        var ensureLogin = function() {

            var deferred = $q.defer();
            console.log(isLoggedIn);
            if (isLoggedIn && currentUser() != null) {
                deferred.resolve();
            } else {
                deferred.reject();
                $window.location.href= '/auth/login';
            }

            return deferred.promise;
        };

        var currentUser = function() {
            if ($window.sessionStorage.user) {
                return JSON.parse($window.sessionStorage.user);
            } else {
                return null;
            }
        };

        var logout = function() {
            $http.get('/auth/logout')
            .then(function(response) {

                console.log(response);

                if (response.status == 200) {
                    isLoggedIn = false;
                    $window.sessionStorage.removeItem('user');
                    $window.location.href = '/';

                }
              
            })

        }


        //ToDo: modify,
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
            ensureLogIn : ensureLogin,
            updateProfile: updateProfile,
            logout: logout,
            getToken : getToken
        };
    }


})();