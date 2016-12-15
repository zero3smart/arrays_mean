angular
    .module('arraysApp')
    .controller('UserEditCtrl', ['$scope', '$state', '$stateParams', '$mdToast', 'AuthService', 'datasets', 'User', 'selectedUser','$mdDialog',
        'Team','$window',
        function ($scope, $state, $stateParams, $mdToast, AuthService, datasets, User, selectedUser,
            $mdDialog,Team,$window) {

            $scope.datasets = datasets;
            $scope.selectedUser = selectedUser;
            $scope.userId = $stateParams.id;

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
                {name: "None", value: ""}
              
            ];


     
   

            $scope.error = "";


            $scope.makeTeamAdmin = function() {

                var confirm = $mdDialog.confirm()
                        .title("Are you sure to make this user the team's admin ?")
                        .textContent('Admin role would be transfered and the admin user will be deleted.')
                        .targetEvent(event)
                        .ok('Yes')
                        .cancel('No');
                    $mdDialog.show(confirm).then(function () {
           
                        Team.switchAdmin({_id:$scope.selectedUser._id})
                        .$promise.then(function(res) {
                            if (!res.error) {
                                AuthService.reload(function(data) {
                                    if (data.success) {
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

                        $scope.vm.userForm.$setPristine();
                        $scope.vm.userForm.$setUntouched();
                    }
                },function(err) {

                });
            };

            $scope.inviteUser = function() {
             

                var queryParams = {
                    email: $scope.selectedUser.email
                };

                User.search(queryParams)
                    .$promise.then(function(data) {
                    if (data.length > 0) {

                        if (data[0]._team.indexOf($scope.team) >= 0 ) {
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


                                $scope.selectedUser.$save(function(savedUser) {

                                    console.log(savedUser);

                                    if (savedUser) {

                                         $mdToast.show(
                                            $mdToast.simple()
                                                .textContent("User Role saved successfully!")
                                                .position('top right')
                                                .hideDelay(3000)
                                        );
                                        $scope.vm.userForm.$setPristine();
                                        $scope.vm.userForm.$setUntouched();
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

            var bindUserRolesToSelectedUser = function() {
                

                if (TeamIdExist) {
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

            var TeamIdExist  = function() {
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

           

            var inviteAndSentEmail = function () {

                AuthService.inviteUser($scope.selectedUser)
                    .then(function(data) {
                        $mdToast.show(
                            $mdToast.simple()
                                .textContent(data)
                                .position('top right')
                                .hideDelay(3000)
                        );

                        $scope.selectedUser = null;
                        $scope.vm.userForm.$setPristine();
                        $scope.vm.userForm.$setUntouched();

                    },function(err) {
                        $mdToast.show(
                            $mdToast.simple()
                                .textContent(err)
                                .position('top right')
                                .hideDelay(3000)
                        );
                    })
            }

        }]);