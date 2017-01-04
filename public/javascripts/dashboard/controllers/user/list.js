angular
    .module('arraysApp')
    .controller('UserListCtrl', ['$scope', '$state', 'AuthService', 'User', '$mdToast', 'users', '$mdDialog', 'datasets', 'Team',
        function ($scope, $state, AuthService, User, $mdToast, users, $mdDialog, datasets, Team) {

            $scope.users = users;
            $scope.datasets = datasets;

            $scope.selectedUser = null; // to remove?

            // to remove?
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

            $scope.openUserDialog = function(ev, selectedUser, user) {
                // if (selectedUser._id != user._id) {
                    $mdDialog.show({
                        controller: UserDialogController,
                        templateUrl: 'templates/blocks/user.edit.html',
                        parent: angular.element(document.body),
                        targetEvent: ev,
                        clickOutsideToClose: true,
                        fullscreen: true,
                        locals: {
                            selectedUser: selectedUser,
                            team: $scope.team,
                            datasets: $scope.datasets
                        }
                    })
                // }
            };
            function UserDialogController($scope, $mdDialog, selectedUser, team, datasets) {
                $scope.selectedUser = selectedUser;
                $scope.team = team;
                $scope.datasets = datasets;

                $scope.userRoles = {};

                if (!$scope.selectedUser._editors) {
                    $scope.selectedUser._editors = [];
                }
                if (!$scope.selectedUser._viewers) {
                    $scope.selectedUser._viewers = [];
                }

                for (var i  = 0; i < datasets.length ; i++) {
                    var Id = datasets[i]._id;

                    if ($scope.selectedUser._editors.indexOf(Id) >= 0) {
                        $scope.userRoles[Id] = "editor"
                    } else if ($scope.selectedUser._viewers.indexOf(Id) >= 0 ) {
                        $scope.userRoles[Id] = "viewer";
                    } else {
                        $scope.userRoles[Id] = "";
                    }
                }

                $scope.availableUserRoles = [
                    {name: "Editor", value: 'editor'},
                    {name: "Viewer", value: 'viewer'},
                    {name: "None", value: ''}

                ];

                $scope.saveUser = function() {
                    bindUserRolesToSelectedUser();

                    $scope.selectedUser.$save(function(savedUser) {
                        if (savedUser) {
                            $mdToast.show(
                                $mdToast.simple()
                                    .textContent("User Role saved successfully!")
                                    .position('top right')
                                    .hideDelay(3000)
                            );
                            $scope.hide();
                        }
                    },function(err) {

                    });
                };

                var bindUserRolesToSelectedUser = function() {
                    if (TeamIdExist()) {
                        $scope.selectedUser._editors = [];
                        $scope.selectedUser._viewers = [];
                    } else {
                         $scope.selectedUser._team.push($scope.team._id);
                    }
                    for (var datasetId in $scope.userRoles) {
                        var role = $scope.userRoles[datasetId];
                        if (role == 'editor') {
                            $scope.selectedUser._editors.push(datasetId);
                        } else if (role == 'viewer') {
                            $scope.selectedUser._viewers.push(datasetId);

                        }
                    }
                }

                var TeamIdExist = function() {
                    for (var i = 0; i < $scope.selectedUser._team.length; i++) {
                        if (typeof $scope.selectedUser._team[i] == 'string') {
                            if ($scope.selectedUser._team[i] == $scope.team._id) {
                                return true;
                            }
                        } else if (typeof $scope.selectedUser._team[i] == 'object') {
                            if ($scope.selectedUser._team[i]._id == $scope.team._id) {
                                return true;
                            }
                        }
                    }
                    return false;
                }


                $scope.inviteUser = function() {

                    var queryParams = {email: $scope.selectedUser.email};

                    User.search(queryParams)
                        .$promise.then(function(data) {

                        if (data.length > 0) {

                            if (data[0]._team.indexOf($scope.team._id) >= 0 ) {
                                $scope.vm.userForm["email"].$setValidity("unique",false)
                            } else {

                                var confirm = $mdDialog.confirm()
                                    .title('Are you sure to grant permission to this user ?')
                                    .textContent('This user does not belong to your team, giving this user permission to edit/view datasets will add' +
                                        ' this user to your team.')
                                    .targetEvent(event)
                                    .ok('Yes')
                                    .cancel('No');
                                $mdDialog.show(confirm).then(function () {
                                    $scope.selectedUser = data[0];
                                    bindUserRolesToSelectedUser();

                                    if (!$scope.selectedUser.defaultLoginTeam) {
                                        $scope.selectedUser.defaultLoginTeam = $scope.team._id;
                                    }

                                    $scope.selectedUser.$save(function(savedUser) {
                                        if (savedUser) {
                                             $mdToast.show(
                                                $mdToast.simple()
                                                    .textContent("User Role saved successfully!")
                                                    .position('top right')
                                                    .hideDelay(3000)
                                            );
                                         }
                                    },function(err) {
                                        $mdToast.show(
                                            $mdToast.simple()
                                                .textContent(err)
                                                .position('top right')
                                                .hideDelay(3000)
                                        );
                                    })

                                }, function () {
                                    console.log('You decided to not to give permission this user to your datasets');
                                });

                            }

                        } else {
                            $scope.selectedUser._team = [$scope.team._id];
                            $scope.selectedUser.defaultLoginTeam = $scope.team._id;

                            bindUserRolesToSelectedUser();
                            inviteAndSentEmail();
                        }
                    })
                };

                var inviteAndSentEmail = function () {
                    AuthService.inviteUser($scope.selectedUser)
                        .then(function(response) {
                            if (response.status == 200) {
                                var user = response.data.user;
                                // $scope.$parent.$parent.user.invited = user.invited; // todo
                                $mdToast.show(
                                    $mdToast.simple()
                                        .textContent('Invitation email sent!')
                                        .position('top right')
                                        .hideDelay(3000)
                                );

                                $scope.selectedUser = null;
                                $scope.hide();
                            }
                        },function(err) {
                            $mdToast.show(
                                $mdToast.simple()
                                    .textContent(err)
                                    .position('top right')
                                    .hideDelay(3000)
                            );
                        })
                }

                $scope.makeTeamAdmin = function() {

                    var confirm = $mdDialog.confirm()
                            .title("Are you sure to make this user the team's admin ?")
                            .textContent('Admin role would be transfered and the admin user will no longer be on the team.')
                            .targetEvent(event)
                            .ok('Yes')
                            .cancel('No');
                        $mdDialog.show(confirm).then(function () {

                            Team.switchAdmin({_id:$scope.selectedUser._id})
                            .$promise.then(function(res) {
                                if (!res.error) {
                                    AuthService.reload(function(data) {
                                        if (data.success) {
                                            $scope.$parent.team = AuthService.currentTeam();
                                            $scope.$parent.users = User.getAll({teamId: $scope.$parent.team._id});

                                            $mdToast.show(
                                                $mdToast.simple()
                                                    .textContent("Admin transfer successfully!")
                                                    .position('top right')
                                                    .hideDelay(3000)
                                            );

                                        } else {
                                            $mdToast.show(
                                                $mdToast.simple()
                                                    .textContent("Opps! Admin did not get transfer!")
                                                    .position('top right')
                                                    .hideDelay(3000)
                                                );
                                        }
                                    })
                                }
                            },function(err) {
                                console.log("err");
                                console.log(err);
                            })
                        }, function () {
                            console.log("User decided not to transfer admin");
                        });
                }

                $scope.hide = function() {
                    $mdDialog.hide();
                };
                $scope.cancel = function() {
                    $mdDialog.cancel();
                };
            }

    }]);
