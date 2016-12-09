angular
    .module('arraysApp')
    .controller('UserEditCtrl', ['$scope', '$state', '$stateParams', '$mdToast', 'AuthService', 'datasets', 'User', 'selectedUser',
        function ($scope, $state, $stateParams, $mdToast, AuthService, datasets, User, selectedUser) {


           


            $scope.datasets = datasets;
            $scope.$parent.$parent.selectedUser = selectedUser;
            $scope.userId = $stateParams.id;
            $scope.userRoles = [];
      
            if (selectedUser._id) {
              
                if ($scope.selectedUser._editors && $scope.selectedUser._editors.length > 0) {
                    $scope.userRoles.push({name: "editor", datasets: $scope.selectedUser._editors});
                }
                if ($scope.selectedUser._viewers && $scope.selectedUser._viewers.length > 0) {
                    $scope.userRoles.push({name: "viewer",datasets: $scope.selectedUser._viewers});
                }

            } else {
                $scope.$parent.$parent.selectedUser._team = [$scope.team._id];

                $scope.userRoles.push({name:"",datasets:[]});
            }
            
            $scope.addMoreRole = function() {
                $scope.userRoles.push({name:"",datasets:[]});
            }

            $scope.availableUserRoles = [
                {name: "Editor", value: 'editor'},
                {name: "Viewer", value: 'viewer'}
            ];


            $scope.checkDuplicateRole = function($index) {
                return function(col) {
                
                
                   return $scope.notChosenRole(col.value,$index);
                }
            }

            $scope.checkDuplicateDatasets = function($index) {
                return function(col) {
                    return $scope.notChosenDataset(col._id,$index);
                }
            }

            $scope.notChosenRole = function(target,index) {

                for (var i = 0; i < $scope.userRoles.length ;i++) {
                    if (index !== i) {
                        if ($scope.userRoles[i].name == target) {
                            return false;
                        }
                    }
                }
                return true;
            }

             $scope.notChosenDataset = function(target,index) {

                for (var i = 0; i < $scope.userRoles.length ;i++) {
                    if (index !== i) {
                        if ($scope.userRoles[i].datasets.indexOf(target) >= 0) {
                            return false;
                        }
                    }
                }
                return true;
            }




            $scope.removeUserRole = function(index) {
                $scope.userRoles.splice(index,1);
            }





            $scope.error = "";

            $scope.saveUser = function() {
               console.log($scope.selectedUser);

               console.log($scope.userRoles);
                // TODO: Update user
                // user.$save(function(err, savedUser) {
                // });
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
                var userToInvite = angular.copy($scope.$parent.$parent.selectedUser); 
                for (var i = 0 ; i < $scope.userRoles.length; i++) {
                    var role = $scope.userRoles[i].name;
                    if (role == 'editor') {
                        $scope.$parent.$parent.selectedUser._editors = $scope.userRoles[i].datasets;
                    } else if (role == 'viewer') {
                        $scope.$parent.$parent.selectedUser._viewers = $scope.userRoles[i].datasets;

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