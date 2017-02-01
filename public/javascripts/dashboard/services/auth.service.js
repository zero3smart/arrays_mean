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

        var getEnv = function() {
            var deferred = $q.defer();
            $http.get('/env')
            .then(function(result) {
                var env = result.data;
                if (env) {
                    deferred.resolve(env);
                } else {
                    deferred.reject();
                }
            })
            return deferred.promise;
        }


        var reload = function(cb) {

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
                                 cb({success:true})
                            })
                        } else {



    
                            $window.sessionStorage.setItem('teams', JSON.stringify(userData._team));
                            cb({success:true})
                        } 
                        
                    } else {
                        cb({success:false})
                        $window.location.href = '/auth/login';
                    }
                }, function (err) {
                    cb({success:false})

                    deferred.reject();
                })
        }


        var ensureLogin = function () {

            var deferred = $q.defer();
            if (isLoggedIn && currentUser() != null) {
                deferred.resolve();
            } else {

               reload(function(data) {
                    if (data.success) {
                        deferred.resolve();

                    } else {
                        deferred.reject();
                        $window.location.href="/auth/login";

                    }
               })
            }

            return deferred.promise;
        };

        var ensureIsAdmin = function () {

            var deferred = $q.defer();
            var user = currentUser();
            if (isLoggedIn && (user.role === 'admin' || user.role === 'superAdmin') ) {
                deferred.resolve();
            } else {
                deferred.reject();
                $window.location.href="/dashboard/account/profile";
            }

            return deferred.promise;
        };

        var ensureActiveSubscription = function () {

            var deferred = $q.defer();
            var user = currentUser();
            var team = currentTeam();
            if (isLoggedIn && ( team.superTeam==true || user.role === 'superAdmin' || team.subscription.state === 'in_trial' || team.subscription.state === 'active') ) {
                deferred.resolve();
            } else {
                deferred.reject();
                $window.location.href="/dashboard/account/profile";
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
                            var cu = currentUser();
                            cu.defaultLoginTeam = teams[0];
                            if (cu.role !== 'superAdmin') {
                                if (cu.defaultLoginTeam.admin == cu._id) {
                                    cu.role = 'admin';
                                } else {
                                    if (cu.role == 'admin' || cu.role == 'viewer') {
                                        for (var i = 0 ; i < cu._editors.length; i++) {
                                            if (cu.defaultLoginTeam.datasourceDescriptions.indexOf(cu._editors[i])>=0) {
                                                cu.role = 'editor';
                                                break;
                                            }
                                        }
                                    }
                                    if (cu.role=='admin' || cu.role == 'editor') {

                                        for (var i = 0 ; i < cu._editors.length; i++) {

                                            if (cu.defaultLoginTeam.datasourceDescriptions.indexOf(cu._editors[i])>=0) {
                                                break;
                                            }
                                        }
                                        if (i >= cu._editors.length) {
                                            cu.role = 'viewer';
                                        }

                                    }

                                }
                            }

                            // console.log(cu);
                            $window.sessionStorage.setItem('user', JSON.stringify(cu));
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

                    deferred.resolve(data.team);
                },function(){   
                    deferred.reject();
                })
            return deferred.promise;
        }



        var logout = function () {
            $http.get('/auth/logout')
                .then(function (response) {
                    if (response.status == 200) {
                        isLoggedIn = false;
                        $window.sessionStorage.removeItem('user');
                        $window.sessionStorage.removeItem('team');
                        $window.sessionStorage.removeItem('teams');
                        $window.location.href = '/';
                    }

                })

        };


      

        var inviteUser = function (newUser) {
            return $http.post('/api/admin/invite', newUser)
        }

        var resendInvite = function(id) {
            var currentUserId = currentUser()._id;
            return $http.get('/api/user/' + currentUserId + '/resend?Invitee=' + id) 
        }



        return {
            currentUser: currentUser,
            currentTeam: currentTeam,
            isLoggedIn: isLoggedIn,
            ensureLogIn: ensureLogin,
            ensureIsAdmin: ensureIsAdmin,
            ensureActiveSubscription: ensureActiveSubscription,
            allTeams: allTeams,
            resendInvite:  resendInvite,
            reload: reload,
            getEnv: getEnv,
            updateTeam: updateTeam,
            inviteUser: inviteUser,
            switchTeam: switchTeam,
            logout: logout,
            getToken: getToken
        };
    }


})();