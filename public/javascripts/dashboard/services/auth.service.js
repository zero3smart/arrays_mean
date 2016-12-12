(function () {
    angular
        .module('arraysApp')
        .service('AuthService', AuthService);

    AuthService.$inject = ['$window', '$q', '$http','Team'];
    function AuthService($window, $q, $http,Team) {

        var isLoggedIn = false;

        var getToken = function () {
            var user = currentUser();
            if (user) {
                return user.authToken;
            }
            return null;
        };


        var ensureLogin = function () {

            var deferred = $q.defer();

            if (isLoggedIn && currentUser() != null) {
                deferred.resolve();
            } else {

                $http.get('/api/user/currentUser')
                    .then(function (result) {

                        var userData = result.data;
                        if (userData) {
                            isLoggedIn = true;  
                            $window.sessionStorage.setItem('user', JSON.stringify(userData));
                            $window.sessionStorage.setItem('team', JSON.stringify(userData.defaultLoginTeam));

                            if (userData.role == "superAdmin") {
                                Team.query()
                                .$promise.then(function(allTeams) {
                                     $window.sessionStorage.setItem('teams', JSON.stringify(allTeams));
                                })
                            } else if (userData.role == 'editor' || userData.role == 'admin') {
                                $window.sessionStorage.setItem('teams', JSON.stringify(userData._team));
                            }
                            deferred.resolve();
                        } else {
                            deferred.reject();
                            $window.location.href = '/auth/login';
                        }
                    }, function (err) {
                        //response error catch the redirecting
                        deferred.reject();
                    })

            }

            return deferred.promise;
        };

        var allTeams = function() {
             if ($window.sessionStorage.teams) {
                return JSON.parse($window.sessionStorage.teams);
            } else {
                return null;
            }
        }

        var currentUser = function () {
            if ($window.sessionStorage.user) {
                return JSON.parse($window.sessionStorage.user);
            } else {
                return null;
            }
        };

        var currentTeam = function () {
            if ($window.sessionStorage.team) {
                return JSON.parse($window.sessionStorage.team);
            } else {
                return null;
            }
        };


        var switchTeam = function (teamId) {
            var deferred = $q.defer();

            Team.search({_id: teamId})
                .$promise
                .then(function(teams) {
                    $window.sessionStorage.setItem('team', JSON.stringify(teams[0]));
                    $http.put('/api/user/defaultLoginTeam/' + teamId)
                        .then(function(response) {
                            deferred.resolve();
                        },function() {
                            deferred.reject();
                        })
                },function() {
                    deferred.reject();
                })
            return deferred.promise;
                
        };

        var updateTeam = function(team) {
           
            var deferred = $q.defer();
            var currentTeamId = currentTeam()._id;


             Team.update({id:currentTeamId},team)  
                .$promise
                .then(function(data) {
                    $window.sessionStorage.setItem('team', JSON.stringify(data.team));
                    var teams = allTeams();
                    for (var i = 0; i < teams.length; i++) {
                        if (teams[i]._id == data.team._id) {
                            teams[i] = data.team;
                            break;
                        }
                    }
                     $window.sessionStorage.setItem('teams', JSON.stringify(teams));

                     console.log(teams);

                    deferred.resolve(data.team);
                },function(){   
                    deferred.reject();
                })
            return deferred.promise;
        }



        var logout = function () {
            $http.get('/auth/logout')
                .then(function (response) {
                    console.log(response);
                    if (response.status == 200) {
                        isLoggedIn = false;
                        $window.sessionStorage.removeItem('user');
                        $window.sessionStorage.removeItem('team');
                        $window.sessionStorage.removeItem('teams');
                        $window.location.href = '/';

                    }

                })

        };


        //ToDo: modify to match our current user acc.
        // var updateProfile = function(user) {
        //     var deferred = $q.defer();
        //     if (isLoggedIn()) {
        //         // update user /api/user/update
        //         $http.post('/api/account/update', user).then(function(data) {
        //             if (!data.error) {
        //                 // Update User
        //                 if (!$window.user._json.user_metadata) $window.user._json.user_metadata = {};
        //                 if (!$window.user._json.user_metadata.name) $window.user._json.user_metadata.name = {};

        //                 $window.user._json.user_metadata.name.givenName = user.givenName;
        //                 $window.user._json.user_metadata.name.familyName = user.familyName;

        //                 return deferred.resolve(data.message);
        //             } else {
        //                 return deferred.reject(data.error);
        //             }
        //         }, function(err) {
        //             return deferred.reject(data.error);
        //         });
        //     } else {
        //         return deferred.reject('You need to login first!'); 
        //     }
        //     return deferred.promise;
        // };


        var inviteUser = function (newUser) {
            var deferred = $q.defer();
            $http.post('/api/admin/invite', newUser)
                .then(function (response) {
                    if (response.status == 200) {
                        return deferred.resolve(response.data.message);
                    } else {

                    }

                })
            return deferred.promise;
        }



        return {
            currentUser: currentUser,
            currentTeam: currentTeam,
            isLoggedIn: isLoggedIn,
            ensureLogIn: ensureLogin,
            allTeams: allTeams,
            // updateProfile: updateProfile,
            updateTeam: updateTeam,
            inviteUser: inviteUser,
            switchTeam: switchTeam,
            logout: logout,
            getToken: getToken
        };
    }


})();