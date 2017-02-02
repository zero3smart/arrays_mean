angular
    .module('arraysApp')
    .controller('AdminCtrl', ['$scope', '$state', 'AuthService', '$window', '$location', '$mdSidenav','env',
        function ($scope, $state, AuthService, $window, $location, $mdSidenav,env) {

            $scope.env = env;

            $scope.currentMenuItem = '';

            $scope.$on('$stateChangeStart',
            function(event, toState, toParams, fromState, fromParams){
                $scope.closeLeft();
            })

            $scope.$on('$stateChangeSuccess',
            function(event, toState, toParams, fromState, fromParams){
                // workaround for ui-sref-active bug
                $scope.currentMenuItem = $scope.$state.current.name.split('.')[1];
            })

            $scope.user = AuthService.currentUser();
            $scope.teams = AuthService.allTeams();

 
            $scope.explore_url = $location.protocol() +  "://";


            if ($scope.env.node_env !== 'enterprise') {
                $scope.explore_url += "app."
            }

            $scope.explore_url += env.host



            $scope.updateSubdomain = function() {
                $scope.team = AuthService.currentTeam();
                
                if ($scope.env.node_env == 'enterprise') {
                    $scope.subdomain = $scope.explore_url;
                } else {

                    $scope.subdomain = $location.protocol() +  "://" + $scope.team.subdomain + "."+  env.host


                }
               
            }




            $scope.updateSubdomain();

    
            $scope.logout = function() {
                AuthService.logout();
            };

            $scope.closeLeft = buildCloser('left');
            $scope.toggleLeft = buildToggler('left');

            function buildCloser(navID) {
                return function() {
                    $mdSidenav(navID).close()
                    .then(function() {
                        document.getElementById('leftNav').blur();
                    })
                }
            }
            function buildToggler(navID) {
                return function() {
                    $mdSidenav(navID).toggle()
                }
            }

    }]);
