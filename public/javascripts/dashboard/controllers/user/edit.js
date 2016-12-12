angular
    .module('arraysApp')
    .controller('UserEditCtrl', ['$scope', '$state', '$stateParams', '$mdToast', 'AuthService', 'datasets', 'User', 'selectedUser','$mdDialog',
        function ($scope, $state, $stateParams, $mdToast, AuthService, datasets, User, selectedUser,
            $mdDialog) {

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
                        
                        bindUserRolesToSelectedUser();
                        inviteAndSentEmail();
                    }

                    
                })

            };

            var bindUserRolesToSelectedUser = function() {

           


                if ($scope.selectedUser._team.indexOf($scope.team._id) >= 0) {
                    $scope.selectedUser._editors = [];
                    $scope.selectedUser._viewers = [];

                } else {
                     $scope.selectedUser._team.push($scope.team._id);
                }

                console.log($scope.userRoles);


                for (var datasetId in $scope.userRoles) {
                    var role = $scope.userRoles[datasetId];
                    if (role == 'editor') {
                        $scope.selectedUser._editors.push(datasetId);

                    } else if (role == 'viewer') {
                        $scope.selectedUser._viewers.push(datasetId);

                    }

                }
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