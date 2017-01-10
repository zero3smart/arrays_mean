angular
    .module('arraysApp')
    .controller('AdminCtrl', ['$scope', '$state', 'AuthService', '$window', '$location', '$mdSidenav',
        function ($scope, $state, AuthService, $window, $location, $mdSidenav) {

            $scope.user = AuthService.currentUser();
            $scope.teams = AuthService.allTeams();

            $scope.updateSubdomain = function() {
                $scope.team = AuthService.currentTeam();
                $scope.subdomain = $location.protocol() +  "://" + $scope.team.subdomain  + "."+ $location.host() + ":" + $location.port();
            }

            $scope.updateSubdomain();

            $scope.explore_url = $location.protocol() +  "://explore." +  $location.host() + ":" + $location.port();

            $scope.logout = function() {
                AuthService.logout();
            };

            $scope.toggleLeft = buildToggler('left');

            function buildToggler(navID) {
                return function() {
                    $mdSidenav(navID).toggle()
                }
            }

            // if (!isSmartDevice($window)) {
            //     $scope.showSideMenu = true;
            // }

            // function isSmartDevice( $window )
            // {
            //     // Adapted from http://www.detectmobilebrowsers.com
            //     var ua = $window['navigator']['userAgent'] || $window['navigator']['vendor'] || $window['opera'];
            //     // Checks for iOs, Android, Blackberry, Opera Mini, and Windows mobile devices
            //     return (/iPhone|iPod|iPad|Silk|Android|BlackBerry|Opera Mini|IEMobile/).test(ua);
            // }

    }]);
