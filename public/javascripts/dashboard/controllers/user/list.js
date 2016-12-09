angular
    .module('arraysApp')
    .controller('UserListCtrl', ['$scope', '$state', 'AuthService', 'User', '$mdToast', 'users',
        function ($scope, $state, AuthService, User, $mdToast, users) {

            $scope.users = users;
            $scope.selectedUser = null;

            $scope.select = function(currentUser, user) {
                if (currentUser._id != user._id)
                    $state.go('dashboard.user.edit', {id: user._id});
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

            $scope.remove = function(user) {
                user.$remove(function(res) {
                    console.log(user, res);
                });
            };

        }]);