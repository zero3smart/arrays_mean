(function () {
    angular
        .module('arraysApp')
        .service('authentication', authentication);

    authentication.$inject = ['$http', '$window', '$q'];
    function authentication ($http, $window, $q) {

        var saveToken = function (token) {
            $window.localStorage['arrays-token'] = token;
        };

        var getToken = function () {
            return $window.localStorage['arrays-token'];
        };

        var isLoggedIn = function() {
            /* var token = getToken();

            if(token){
                var payload;
                payload = token.split('.')[1];
                payload = $window.atob(payload);
                payload = JSON.parse(payload);

                return payload.exp > Date.now() / 1000;
            } else {
                return false;
            } */

            return $window.user ? true : false;
        };

        var currentUser = function() {
            if(isLoggedIn()){
                /* var token = getToken();
                var payload = token.split('.')[1];
                payload = $window.atob(payload);
                payload = JSON.parse(payload);
                return {
                    email : payload.email,
                    name : payload.name
                }; */
                return $window.user;
            }
        };

        register = function(user) {
            return $http.post('/api/register', user).success(function(data){
                saveToken(data.token);
            });
        };

        login = function(user) {
            var deferred = $q.defer();
            $http.post('/api/login', user).success(function(data) {
                saveToken(data.token);
                return deferred.promise();
            });
        };

        logout = function() {
            var deferred = $q.defer();
            $window.localStorage.removeItem('arrays-token');
            return deferred.promise();
        };

        return {
            currentUser : currentUser,
            //saveToken : saveToken,
            //getToken : getToken,
            isLoggedIn : isLoggedIn,
            //register : register,
            //login : login,
            //logout : logout
        };
    }


})();