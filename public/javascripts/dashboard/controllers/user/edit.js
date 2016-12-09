angular
    .module('arraysApp')
    .controller('UserEditCtrl', ['$scope', '$state', '$stateParams', '$mdToast', 'AuthService', 'datasets', 'User', 'selectedUser',
        function ($scope, $state, $stateParams, $mdToast, AuthService, datasets, User, selectedUser) {

            $scope.datasets = datasets;
            $scope.$parent.$parent.selectedUser = selectedUser;
            $scope.userId = $stateParams.id;

            $scope.availableUserRoles = [
                {name: "Editor", value: 'editor'},
                {name: "Viewer", value: 'viewer'}
            ];

            $scope.error = "";

            $scope.saveUser = function(user) {
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