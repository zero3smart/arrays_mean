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

                // Update Intercom state
                window.Intercom('update');
            });

            /**
             * Nag user if dataset is dirty and needs to be processed
             */
            $scope.remindUserUnsavedChanges = false;

            /**
             * Set this per view to discard changes, i.e. reset()
             */
            $scope.discardChangesThisView = angular.noop;

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

            $scope.sidebarNavigate = function(state) {
                if($scope.remindUserUnsavedChanges) {
                    var dialogPromise = $scope.openUnsavedChangesDialog('Continue Editing');
                    dialogPromise.then(function() {
                        // Discard changes
                        $scope.discardChangesThisView();
                        $scope.setRemindUserUnsavedChanges(false);
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

            /**
             * If remindUserUnsavedChanges, show browser dialog to remind user to save changes.
             * These event listeners only check for navigation outside of the dashboard or page refresh.
             */
            function beforeUnloadMessage(e) {
                // show this message, if browser allows custom text (not any modern browsers)
                var dialogText = 'You have unsaved changes. Are you sure you want to leave this page?';
                e.returnValue = dialogText;
                return dialogText;
            }

            $scope.setRemindUserUnsavedChanges = function(bool) {
                $scope.remindUserUnsavedChanges = bool;
                if (bool) {
                    window.addEventListener('beforeunload', beforeUnloadMessage, false);
                } else {
                    window.removeEventListener('beforeunload', beforeUnloadMessage, false);
                }
            };


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

                    $scope.subdomain = $location.protocol() +  '://' + $scope.team.subdomain + '.' +  env.host;


                }

            };


            $scope.updateSubdomain();

            $scope.logout = function() {
                // Shut down Intercom when loggin out
                window.Intercom('shutdown');

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


            /**
             * Start Intercom support widget
             */
            window.Intercom('boot', {
                app_id: $scope.env.intercomAppId,
                name: $scope.user.firstName + ' ' + $scope.user.lastName, // Full name
                email: $scope.user.email, // Email address
                created_at: new Date($scope.user.createdAt).getTime() / 1000, // Signup date as a Unix timestamp
                company: {
                    id: $scope.user.defaultLoginTeam._id,
                    name: $scope.user.defaultLoginTeam.title,
                    created_at: new Date($scope.user.defaultLoginTeam.createdAt).getTime() / 1000,
                    plan: $scope.user.defaultLoginTeam.subscription ? $scope.user.defaultLoginTeam.subscription.plan.plan_code : ''
                }
            });

        }]);
