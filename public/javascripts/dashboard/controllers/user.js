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
                    if (data[0]._team !== $scope.user._team) {
                      $scope.vm.userForm.email.$setValidity('team', false);

                    } else {
                      $scope.newUser._id = data[0]._id;
                      AuthService.inviteUser($scope.newUser)
                        .$promise.then(function(data) {

                        })
                    }
                  } else {
                    AuthService.inviteUser($scope.newUser,function(data) {
                      
                    })
                      // .$promise.then(function(data) {
                      //   console.log(data);
                      //   // $mdToast.show(
                      //   //     $mdToast.simple()
                      //   //         .textContent("Invi")
                      //   //         .position('top right')
                      //   //         .hideDelay(3000)
                      //   // );


                      // },function(err) {
                      //   console.log(err);
                      //   $mdToast.show(
                      //       $mdToast.simple()
                      //           .textContent(err.message)
                      //           .position('top right')
                      //           .hideDelay(3000)
                      //   );

                      // })

                  }



                  
                })

           }

           // $scope.error = "";

           // $scope.inviteUser = function() { 
           //    var queryParams = {
           //      email: $scope.newUser.email
           //    }

           //    User.search(queryParams)
           //      .$promise.then(function(data) {
           //        if (data.length > 0) { 
           //          if (data[0]._team !== $scope.user._team) {
           //            $scope.error = "This user is a member of another team";
           //          } else {
           //            $scope.newUser._id = data[0]._id;
           //          }
           //        }
           //        if (!$scope.error) {

           //          AuthService.inviteUser($scope.newUser)
           //          .$promise.then(function(data) {
           //            console.log(data);
           //          })
                

           //        }
           //      }

           // }

   
          

        }]);