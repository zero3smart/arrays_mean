angular
    .module('arraysApp')
    .controller('UserListCtrl', ['$scope', '$state', 'AuthService', 'User', '$mdToast', 'users', '$mdDialog', 'datasets', 'Team', '$window',
        function ($scope, $state, AuthService, User, $mdToast, users, $mdDialog, datasets, Team, $window) {

            $scope.primaryAction.disabled = true;
            $scope.primaryAction.text = 'Invite User';

            $scope.users = users;
            $scope.datasets = datasets;

            users.$promise.then(function(users) {
                $scope.updatePrimaryActionAbility();
            });

            $scope.userRoles = {};


            $scope.updateUserRoles = function(user) {

                if (user && !user._editors) {
                    user._editors = [];
                }
                if (user&& !user._viewers) {
                    user._viewers = [];
                }

                for (var i  = 0; i < datasets.length ; i++) {
                    var Id = datasets[i]._id;

                    if (user && user._editors.indexOf(Id) >= 0) {
                        $scope.userRoles[Id] = 'editor';
                    } else if (user && user._viewers.indexOf(Id) >= 0 ) {
                        $scope.userRoles[Id] = 'viewer';
                    } else {
                        $scope.userRoles[Id] = '';
                    }
                }

            };


            $scope.bindUserRolesToSelectedUser = function(user) {

                var TeamIdExist = function() {
                    for (var i = 0; i < user._team.length; i++) {
                        if (typeof user._team[i] == 'string') {
                            if (user._team[i] == $scope.team._id) {
                                return true;
                            }
                        } else if (typeof user._team[i] == 'object') {
                            if (user._team[i]._id == $scope.team._id) {
                                return true;
                            }
                        }
                    }
                    return false;
                };


                if (TeamIdExist()) {
                    user._editors = [];
                    user._viewers = [];
                } else {
                    user._team.push($scope.team._id);
                }
                for (var datasetId in $scope.userRoles) {
                    var role = $scope.userRoles[datasetId];
                    if (role == 'editor') {
                        user._editors.push(datasetId);
                    } else if (role == 'viewer') {
                        user._viewers.push(datasetId);

                    }
                }
            };


            $scope.updatePrimaryActionAbility = function() {
                if ($scope.$parent.team && $scope.$parent.team.subscription && $scope.$parent.team.subscription.quantity) {
                    $scope.subscriptionQuantity = parseInt($scope.$parent.team.subscription.quantity);
                } else {
                    $scope.subscriptionQuantity = 0;
                }

                if ($scope.$parent.user === 'superAdmin' || $scope.$parent.team.superTeam === true) {
                    $scope.primaryAction.disabled = false;
                } else {
                    // console.log($scope.users);
                    // console.log($scope.datasets);

                    // Only limit Editor users on subscription
                    var editorUsers = [];
                    angular.forEach($scope.users, function(user) {
                        angular.forEach($scope.datasets, function(dataset) {

                            if (user._editors.indexOf(dataset._id) !== -1) {
                                editorUsers.push(user);
                            }
                        });
                    });

                    $scope.primaryAction.disabled = $scope.subscriptionQuantity > editorUsers.length + 1 ? false : true;
                }
            };

            $scope.primaryAction.do = function(ev) {
                $scope.openUserDialog(ev, {});
            };

            $scope.remove = function(person, ev) {

                $mdDialog.show({
                    templateUrl: 'templates/blocks/user.delete.html',
                    parent: angular.element(document.body),
                    targetEvent: ev,
                    clickOutsideToClose: true,
                    fullscreen: true,
                    locals: {
                        person: person,
                        team: $scope.team
                    },
                    controller: function($scope, $mdDialog, person, team) {
                        $scope.person = person;
                        $scope.team = team;
                        $scope.hide = function() {
                            $mdDialog.hide();
                        };
                        $scope.cancel = function() {
                            $mdDialog.cancel();
                        };
                    }
                })
                    .then(function () {

                        person.$remove(function(res) {
                            if (res.success == 'ok') {
                                $scope.users.splice($scope.users.indexOf(person), 1);
                                $scope.updatePrimaryActionAbility();

                                $mdToast.show(
                                $mdToast.simple()
                                    .textContent('User deleted.')
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
                        });

                    }, function () {
                        // console.log('You decided to keep this user.');
                    });

            };

            $scope.openUserDialog = function(ev, selectedUser, user) {

                // if (selectedUser._id != user._id) {
                $mdDialog.show({
                    controller: UserDialogController,
                    templateUrl: 'templates/blocks/user.edit.html',
                    parent: angular.element(document.body),
                    targetEvent: ev,
                    scope:  $scope.$new(),
                    clickOutsideToClose: true,
                    fullscreen: true,
                    locals: {
                        selectedUser: selectedUser
                    }
                }).then(function(object) {
                    if (object && object.invitedUser) $scope.users.push(object.invitedUser);
                    if (object && object.user && object.user.invited) {
                        $scope.$parent.user.invited = object.user.invited;
                        $window.sessionStorage.setItem('user', JSON.stringify($scope.$parent.user));
                    }
                },function(data) {
                    if (data && data.modalType =='admin' && data.person) {
                        $scope.openAdminDialog(ev,data.person);
                    } else if (data && data.modalType == 'permission' && data.selectedUser) {
                        $scope.openPermissionDialog(ev,data.selectedUser);
                    }
                });
                // }
            };

            $scope.openPermissionDialog = function(ev,selected) {

                $mdDialog.show({
                    templateUrl: 'templates/blocks/user.permissions.html',
                    parent: angular.element(document.body),
                    targetEvent: ev,
                    clickOutsideToClose: true,
                    fullscreen: true,
                    locals: {
                        email: selected.email,
                        team: $scope.team
                    },
                    controller: function($scope, $mdDialog, email, team) {
                        $scope.email = email;
                        $scope.team = team;

                        $scope.hide = function(data) {
                            $mdDialog.hide(data);
                        };
                        $scope.cancel = function() {
                            $mdDialog.cancel();
                        };
                    }
                })
                    .then(function () {
                        $scope.bindUserRolesToSelectedUser(selected);
                        $scope.updateUserRoles(selected);

                        if (!selected.defaultLoginTeam) {
                            selected.defaultLoginTeam = $scope.team._id;
                        }


                        AuthService.inviteUser(selected)
                            .then(function(response) {
                                if (response.status == 200) {
                                    $mdToast.show(
                                    $mdToast.simple()
                                        .textContent('User role saved!')
                                        .position('top right')
                                        .hideDelay(3000)
                                );
                                    $scope.users.push(selected);
                                }
                            },function(err) {
                                $mdToast.show(
                                $mdToast.simple()
                                    .textContent(err)
                                    .position('top right')
                                    .hideDelay(3000)
                            );
                            });

                    }, function () {
                    // console.log('You decided to not to give permission this user to your datasets');
                    });
            };

            $scope.openAdminDialog = function(ev,person) {


                $mdDialog.show({
                    templateUrl: 'templates/blocks/user.admin.html',
                    parent: angular.element(document.body),
                    targetEvent: ev,
                    clickOutsideToClose: true,
                    fullscreen: true,
                    locals: {
                        person: person,
                        team: $scope.team
                    },
                    controller: function($scope,$mdDialog,person,team) {
                        $scope.person = person;

                        $scope.team = team;

                        $scope.hide = function() {
                            $mdDialog.hide();
                        };
                        $scope.cancel = function() {
                            $mdDialog.cancel();
                        };
                    }
                }).then(function() {
                    Team.switchAdmin({_id: person._id})
                        .$promise.then(function(res) {
                            if (!res.error) {
                                AuthService.reload(function(data) {

                                    if (data.success) {

                                        $scope.$parent.team  = $scope.$parent.$parent.team = AuthService.currentTeam();
                                        $scope.$parent.$parent.user = AuthService.currentUser();
                                        $scope.$parent.$parent.teams = AuthService.allTeams();

                                        console.log($scope);

                                        $scope.users = User.getAll({teamId: $scope.$parent.team._id});
                                        $mdToast.show(
                                        $mdToast.simple()
                                            .textContent('Admin role transferred!')
                                            .position('top right')
                                            .hideDelay(3000)
                                    );
                                    } else {
                                        $mdToast.show(
                                        $mdToast.simple()
                                            .textContent('Error! Admin role not transferred.')
                                            .position('top right')
                                            .hideDelay(3000)
                                        );
                                    }
                                });
                            }
                        });

                },function() {
                    // console.log('user decided not to transfer admin');
                });
            };


            function UserDialogController($scope, $mdDialog, selectedUser) {

                $scope.selectedUser = selectedUser;

                $scope.updateUserRoles(selectedUser);

                $scope.availableUserRoles = [
                    {name: 'Editor', value: 'editor'},
                    {name: 'Viewer', value: 'viewer'},
                    {name: 'None', value: ''}

                ];

                $scope.hide = function(data) {
                    $mdDialog.hide(data);
                };
                $scope.cancel = function(data) {
                    $mdDialog.cancel(data);
                };

                $scope.saveUser = function() {
                    $scope.bindUserRolesToSelectedUser(selectedUser);
                    $scope.updateUserRoles(selectedUser);

                    selectedUser.$save(function(savedUser) {
                        if (savedUser) {
                            $mdToast.show(
                                $mdToast.simple()
                                    .textContent('User Role saved successfully!')
                                    .position('top right')
                                    .hideDelay(3000)
                            );

                        }
                        $scope.hide();
                    },function(err) {

                        $mdToast.show(
                            $mdToast.simple()
                                .textContent(err)
                                .position('top right')
                                .hideDelay(3000)
                        );
                    });
                };


                $scope.inviteUser = function(ev) {

                    var userEmail = selectedUser.email,
                        queryParams = {email: userEmail};

                    User.search(queryParams)
                        .$promise.then(function(data) {

                            if (data.length) { // if user exists

                                if (data[0]._team.indexOf($scope.team._id) >= 0 ) {
                                    $scope.vm.userForm['email'].$setValidity('unique',false);
                                } else {
                                    $scope.cancel({modalType: 'permission', selectedUser: data[0]});
                                }

                            } else {
                                selectedUser._team = [$scope.team._id];
                                selectedUser.defaultLoginTeam = $scope.team._id;

                                $scope.bindUserRolesToSelectedUser(selectedUser);
                                inviteAndSentEmail();
                            }
                        });
                };

                var inviteAndSentEmail = function () {
                    AuthService.inviteUser($scope.selectedUser)
                        .then(function(response) {
                            if (response.status == 200) {
                                var user = response.data.user;
                                var invitedUser = response.data.invitedUser;


                                $mdToast.show(
                                    $mdToast.simple()
                                        .textContent('Invitation sent!')
                                        .position('top right')
                                        .hideDelay(3000)
                                );

                                $scope.selectedUser = null;
                                $scope.userRoles = {};

                                $scope.hide({user:user, invitedUser: invitedUser});
                            }
                        },function(err) {
                            $mdToast.show(
                                $mdToast.simple()
                                    .textContent(err)
                                    .position('top right')
                                    .hideDelay(3000)
                            );
                        });
                };


                $scope.makeTeamAdmin = function(ev, person) {
                    $scope.cancel({person: person,modalType: 'admin'}); // return to the scope to show modal, so that $parent scope can be set
                };


            }


            $scope.resendInvite = function(invitedUser, ev) {

                $mdDialog.show({
                    templateUrl: 'templates/blocks/user.resend.html',
                    parent: angular.element(document.body),
                    targetEvent: ev,
                    clickOutsideToClose: true,
                    fullscreen: true,
                    locals: {
                        person: invitedUser,
                    },
                    controller: function($scope, $mdDialog, person) {
                        $scope.person = person;
                        $scope.hide = function() {
                            $mdDialog.hide();
                        };
                        $scope.cancel = function() {
                            $mdDialog.cancel();
                        };
                    }
                })
                    .then(function () {

                        AuthService.resendInvite(invitedUser._id)
                            .then(function(response) {
                                if (response.status == 200) {
                                    $mdToast.show(
                                $mdToast.simple()
                                    .textContent('Invitation resent!')
                                    .position('top right')
                                    .hideDelay(3000)
                            );
                                }
                            },function(err) {
                                console.log(err);
                                $mdToast.show(
                            $mdToast.simple()
                                .textContent(err)
                                .position('top right')
                                .hideDelay(3000)
                        );
                            });

                    });

            };

        }]);
