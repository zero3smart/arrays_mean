angular
    .module('arraysApp')
    .controller('UserCtrl', ['$scope', '$state', 'AuthService', 'datasets','User','$mdToast',
        function ($scope, $state, AuthService, datasets,User,$mdToast) {
            $scope.datasets = datasets;
         

           $scope.availableUserRoles = [
            {name: "Editor", value: 'editor'},
            {name: "Viewer", value: 'viewer'}
           ]


           $scope.error = "";
           $scope.inviteUser = function() {
              var queryParams = {
                email: $scope.newUser.email
              }


              User.search(queryParams)
                .$promise.then(function(data) {
                  if (data.length > 0) {
                      $scope.newUser._id = data[0]._id;
                      inviteAndSentEmail();
                    
                  } else {
                    inviteAndSentEmail();
                  }
                })

           }

          var inviteAndSentEmail = function () {
            AuthService.inviteUser($scope.newUser)
                .then(function(data) {
                   $mdToast.show(
                        $mdToast.simple()
                            .textContent(data)
                            .position('top right')
                            .hideDelay(3000)
                    );
                   $scope.newUser = {};
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