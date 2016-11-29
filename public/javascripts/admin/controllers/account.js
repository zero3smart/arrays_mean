angular.module('arraysApp')
    .controller('AccountCtrl', ['$scope', 'AuthService',
        function($scope, AuthService) {


            $scope.init = function() {
                // if ($scope.user.provider=='auth0') {
                //     $scope.userFormData = { id: $scope.user.id };

                //     if ($scope.user._json.user_metadata && $scope.user._json.user_metadata.name) {
                //         $scope.userFormData.givenName = $scope.user._json.user_metadata.name.givenName;
                //         $scope.userFormData.familyName = $scope.user._json.user_metadata.name.familyName;
                //     }
                // }
            }

            $scope.updateProfile = function() {
                $('.butterbar').removeClass('hide').addClass('active');
                AuthService.updateProfile($scope.userFormData)
                    .then(function(msg) {
                        $('.butterbar').removeClass('active').addClass('hide');
                        $scope.message = msg;
                    }, function(err) {
                        $('.butterbar').removeClass('active').addClass('hide');
                        $scope.error = err;
                    });
            }
        }
    ]);