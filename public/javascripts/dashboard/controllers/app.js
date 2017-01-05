angular
    .module('arraysApp')
    .controller('AdminCtrl', ['$scope', '$state', 'AuthService', '$window', '$location',
        function ($scope, $state, AuthService, $window, $location) {

            $scope.user = AuthService.currentUser();
            $scope.teams = AuthService.allTeams();

            $scope.updateSubdomain = function() {
                $scope.team = AuthService.currentTeam();
                $scope.subdomain = $location.protocol() +  "://" + $scope.team.subdomain  + "."+ $location.host() + ":" + $location.port();
            }

            $scope.updateSubdomain();

            $scope.explore_url = $location.protocol() +  "://explore." +  $location.host() + ":" + $location.port();
    
            if (!isSmartDevice($window)) {
                $scope.showSideMenu = true;
            }

            $scope.logout = function() {
                AuthService.logout();
            };

            function isSmartDevice( $window )
            {
                // Adapted from http://www.detectmobilebrowsers.com
                var ua = $window['navigator']['userAgent'] || $window['navigator']['vendor'] || $window['opera'];
                // Checks for iOs, Android, Blackberry, Opera Mini, and Windows mobile devices
                return (/iPhone|iPod|iPad|Silk|Android|BlackBerry|Opera Mini|IEMobile/).test(ua);
            }

        }]);