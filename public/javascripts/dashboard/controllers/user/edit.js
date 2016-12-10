angular
    .module('arraysApp')
    .controller('UserEditCtrl', ['$scope', '$state', '$stateParams', '$mdToast', 'AuthService', 'datasets', 'User', 'selectedUser',
        function ($scope, $state, $stateParams, $mdToast, AuthService, datasets, User, selectedUser) {

            $scope.datasets = datasets;
            $scope.$parent.$parent.selectedUser = selectedUser;
            $scope.userId = $stateParams.id;

            $scope.userRoles = {};

      
            if (!selectedUser._id) {
                $scope.$parent.$parent.selectedUser._team = [$scope.team._id];
                $scope.$parent.$parent.selectedUser._editors = [];
                $scope.$parent.$parent.selectedUser._viewers = [];
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
                    }
                },function(err) {

                });
            };

            $scope.inviteUser = function() {
             

                var queryParams = {
                    email: $scope.$parent.$parent.selectedUser.email
                };

                User.search(queryParams)
                    .$promise.then(function(data) {
                    if (data.length > 0) {
                        $scope.vm.userForm["email"].$setValidity("unique",false)
                    } else {
                        bindUserRolesToSelectedUser();
                        inviteAndSentEmail();
                    }

                    
                })

            };

            var bindUserRolesToSelectedUser = function() {
                $scope.$parent.$parent.selectedUser._editors = [];
                $scope.$parent.$parent.selectedUser._viewers = [];

                for (var datasetId in $scope.userRoles) {
                    var role = $scope.userRoles[datasetId];
                    if (role == 'editor') {
                        $scope.$parent.$parent.selectedUser._editors.push(datasetId);

                    } else if (role == 'viewer') {
                        $scope.$parent.$parent.selectedUser._viewers.push(datasetId);

                    }

                }
            }

           

            var inviteAndSentEmail = function () {


                AuthService.inviteUser($scope.$parent.$parent.selectedUser)
                    .then(function(data) {
                        $mdToast.show(
                            $mdToast.simple()
                                .textContent(data)
                                .position('top right')
                                .hideDelay(3000)
                        );

                        $scope.selectedUser = null;
                        $scope.userRoles = [{name:"",datasets:[]}];

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