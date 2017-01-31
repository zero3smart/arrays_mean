angular
    .module('arraysApp')
    .controller('AdminCtrl', ['$scope', '$state', 'AuthService', '$window', '$location', '$mdSidenav',
        function ($scope, $state, AuthService, $window, $location, $mdSidenav) {

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
            $scope.isEnterprise = false
            
            $scope.host = $location.host() + ":" + $location.port();
            $scope.explore_url = $location.protocol() +  "://explore." +  $scope.host ;


            if ($location.host().indexOf('arrays.co') == -1) {
                $scope.isEnterprise = true;
                $scope.explore_url = $location.protocol() + "://" + $scope.host;
            }

            $scope.updateSubdomain = function() {
                if ($scope.isEnterprise) {
                    $scope.subdomain = $scope.explore_url;
                } else {
                    $scope.team = AuthService.currentTeam();
                    $scope.subdomain = $location.protocol() +  "://" + $scope.team.subdomain  + "."+ $scope.host;

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
