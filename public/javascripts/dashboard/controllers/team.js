angular
    .module('arraysApp')
    .controller('TeamCtrl', ['$scope', '$state', 'AuthService','Team','teams','$mdToast',
        function ($scope, $state, AuthService,Team,teams,$mdToast) {

          $scope.teams = teams;


            $scope.checkSubdomain = function() {

              var params = {subdomain: $scope.newTeam.subdomain};
              Team.search(params)
                .$promise.then(function(data) {
                  if (data.length == 0) {
                    $scope.teamForm.subdomain.$setValidity('unique', true);
                  } else {
                    $scope.teamForm.subdomain.$setValidity('unique', false);
                  }
                },function(err) {

                })

            }

            $scope.createTeam = function() {
          
           
                var team = new Team($scope.newTeam);
                team.$save(function(team) {

                   $mdToast.show(
                      $mdToast.simple()
                          .textContent('New Team created successfully!')
                          .position('top right')
                          .hideDelay(3000)
                  );
                   $scope.teams.push(team);

                   $scope.newTeam = {};
                   $scope.teamForm.$setPristine();
                   $scope.teamForm.$setUntouched();


                  
                },function(err) {
                  $mdToast.show(
                      $mdToast.simple()
                          .textContent(err.message)
                          .position('top right')
                          .hideDelay(3000)
                  );


                })
               
                
            


            }

            $scope.signInWithTeam = function($index) {
              AuthService.switchTeam($scope.teams[$index]);
              $scope.$parent.team = AuthService.currentTeam();


            }
           
   
          

        }]);