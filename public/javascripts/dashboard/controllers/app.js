angular
    .module('arraysApp')
    .controller('AdminCtrl', ['$scope', '$state', 'AuthService', '$window', '$location', '$mdSidenav', 'env', '$mdDialog',
        function ($scope, $state, AuthService, $window, $location, $mdSidenav, env, $mdDialog) {

            $scope.env = env;

            $scope.currentMenuItem = '';

            $scope.$on('$stateChangeStart',
            function(event, toState, toParams, fromState, fromParams){
                $scope.closeLeft();
            });

            $scope.$on('$stateChangeSuccess',
            function(event, toState, toParams, fromState, fromParams){
                // workaround for ui-sref-active bug
                $scope.currentMenuItem = $scope.$state.current.name.split('.')[1];
            });

            /**
             * Nag user if dataset is dirty and needs to be processed
             * Returns promise
             */
            $scope.openUnsavedChangesDialog = function(cancelText) {
                return $mdDialog.show({
                    controller: unsavedChangesDialogCtrl,
                    controllerAs: 'dialog',
                    templateUrl: 'templates/blocks/dataset.unsaved.html',
                    clickOutsideToClose: true,
                    fullscreen: true, // Only for -xs, -sm breakpoints.
                    locals: {
                        cancelText: cancelText
                    }
                });
            };

            /** If dataset is dirty, remind user to save before navigating away */
            $scope.sidebarNavigate = function(state) {
                if($scope.currentMenuItem == 'dataset' && $scope.dataset.dirty) {
                    var dialogPromise = $scope.openUnsavedChangesDialog('Continue Editing');
                    dialogPromise.then(function() {
                        // Discard changes
                        $state.go(state);
                    }, function() {
                        // Continue editing
                    });
                } else {
                    $state.go(state);
                }
            };

            function unsavedChangesDialogCtrl($scope, $mdDialog, cancelText) {
                $scope.cancelText = cancelText;
                $scope.hide = function() {
                    $mdDialog.hide();
                };
                $scope.cancel = function () {
                    $mdDialog.cancel();
                };
            }

            $scope.user = AuthService.currentUser();

            $scope.teams = AuthService.allTeams();

            $scope.explore_url = $location.protocol() +  '://';


            if ($scope.env.node_env !== 'enterprise') {
                $scope.explore_url += 'app.';
            }

            $scope.explore_url += env.host;

            $scope.updateSubdomain = function() {
                $scope.team = AuthService.currentTeam();
                $scope.team.subscription = $scope.team.subscription || {};
                $scope.team.subscription.state = $scope.team.subscription.state || {};

                if ($scope.env.node_env == 'enterprise') {
                    $scope.subdomain = $scope.explore_url;
                } else {

                    $scope.subdomain = $location.protocol() +  '://' + $scope.team.subdomain + '.'+  env.host;


                }

            };


            $scope.updateSubdomain();

            $scope.logout = function() {
                AuthService.logout();
            };

            /**
             * Sidebar
             */
            $scope.closeLeft = buildCloser('left');
            $scope.toggleLeft = buildToggler('left');

            function buildCloser(navID) {
                return function() {
                    $mdSidenav(navID).close()
                    .then(function() {
                        document.getElementById('leftNav').blur();
                    });
                };
            }
            function buildToggler(navID) {
                return function() {
                    $mdSidenav(navID).toggle();
                };
            }

        }]);
