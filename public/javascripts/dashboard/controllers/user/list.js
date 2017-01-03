angular
    .module('arraysApp')
    .controller('UserListCtrl', ['$scope', '$state', 'AuthService', 'User', '$mdToast', 'users','$mdDialog',
        function ($scope, $state, AuthService, User, $mdToast, users,$mdDialog) {

            $scope.users = users;

            $scope.selectedUser = null;

            $scope.select = function(currentUser, user) {
                if (currentUser._id != user._id) {
                      $state.go('dashboard.user.edit', {id: currentUser._id});
                }
            };

            $scope.toggleActive = function(user) {
                user.$save(function(savedUser, res) {
                    if (res.error) {
                        $mdToast.show(
                            $mdToast.simple()
                                .textContent(res.error)
                                .position('top right')
                                .hideDelay(5000)
                        );
                    } else if (res.success == 'ok') {
                        $mdToast.show(
                            $mdToast.simple()
                                .textContent('Updated successfully')
                                .position('top right')
                                .hideDelay(5000)
                        );
                    }
                });
            };

            $scope.remove = function($index) {

                var confirm = $mdDialog.confirm()
                    .title('Are you sure to delete this user? ')
                    .textContent('This user will be deleted permanently.')
                    .targetEvent(event)
                    .ok('Yes')
                    .cancel('No');
                $mdDialog.show(confirm).then(function () {
                    var user = $scope.users[$index];
                    user.$remove(function(res) {
                        if (res.success == 'ok') {
                            $scope.users.splice($index,1);

                             $mdToast.show(
                                $mdToast.simple()
                                    .textContent('User deleted successfully!')
                                    .position('top right')
                                    .hideDelay(5000)
                            );
                        }

                    },function(err) {
                        $mdToast.show(
                            $mdToast.simple()
                                .textContent(err)
                                .position('top right')
                                .hideDelay(5000)
                        );
                    })

                }, function () {
                    console.log('You decided to keep this user.');
                });

            };

            $scope.openInviteUserDialog = function(ev) {
                $mdDialog.show({
                    controller: InviteUserDialogController,
                    templateUrl: 'templates/blocks/user.invite.html',
                    parent: angular.element(document.body),
                    targetEvent: ev,
                    clickOutsideToClose: true,
                    fullscreen: true,
                    // locals: {
                    //     user: $scope.user
                    // }
                })
                // .then(function(team) {
                //     $scope.teams.push(team);
                // });
            };
            function InviteUserDialogController($scope, $mdDialog) {
                $scope.hide = function() {
                    $mdDialog.hide();
                };
                $scope.cancel = function() {
                    $mdDialog.cancel();
                };
            }

    }]);
