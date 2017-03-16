angular.module('arraysApp')
    .controller('AccountCtrl', ['$scope', 'AuthService','$state','User','$mdToast',
        function($scope, AuthService,$state,User,$mdToast) {

            //profile or password
            $scope.currentNavItem = $state.current.url.slice(1,$state.current.url.length);



            $scope.updateProfile = function() {
                // $('.butterbar').removeClass('hide').addClass('active');
                // AuthService.updateProfile($scope.userFormData)
                //     .then(function(msg) {
                //         $('.butterbar').removeClass('active').addClass('hide');
                //         $scope.message = msg;
                //     }, function(err) {
                //         $('.butterbar').removeClass('active').addClass('hide');
                //         $scope.error = err;
                //     });
            }


            $scope.resetPassword = function() {

                User.updateProfile({id:$scope.user._id},{password: $scope.password})
                .$promise.then(function(response) {
                    $scope.user =response;
                     $mdToast.show(
                        $mdToast.simple()
                            .textContent('Password updated!')
                            .position('top right')
                            .hideDelay(3000)
                            )

                })


            }
        }
    ]);
