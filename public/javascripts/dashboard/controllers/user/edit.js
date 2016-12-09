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
                
                
                   return $scope.notChosen(col.value,$index);
                }
            }

            $scope.notChosen= function(target,index) {
                for (var i = 0; i < $scope.userRoles.length ;i++) {
                    if (index !== i) {
                        if ($scope.userRoles[i].name == target) {
                            return false;
                        }
                    }
                }
                return true;
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
                        $scope.$parent.$parent.selectedUser._id = data[0]._id;
                    }
                    inviteAndSentEmail();
                })

            };

            var inviteAndSentEmail = function () {
                AuthService.inviteUser($scope.$parent.$parent.selectedUser)
                    .then(function(data) {
                        $mdToast.show(
                            $mdToast.simple()
                                .textContent(data)
                                .position('top right')
                                .hideDelay(3000)
                        );
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