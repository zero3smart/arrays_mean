angular
    .module('arraysApp')
    .controller('TeamCtrl', ['$scope', '$state', 'AuthService','Team','$mdToast','$mdDialog','$window',
        function ($scope, $state, AuthService,Team,$mdToast,$mdDialog,$window) {

            $scope.openAddTeamDialog = function(ev) {
                $mdDialog.show({
                    controller: AddTeamDialogController,
                    templateUrl: 'templates/blocks/team.add.html',
                    parent: angular.element(document.body),
                    targetEvent: ev,
                    clickOutsideToClose: true,
                    fullscreen: true,
                    locals: {
                        user: $scope.user
                    }
                })
                .then(function(team) {
                    $scope.teams.push(team);
                    $window.sessionStorage.setItem('teams', JSON.stringify($scope.teams));
                });
            };



            $scope.deleteTeam = function(index) {
                //show warning, ask for confirmation
                var teamId = $scope.teams[index]._id;
                var teamName = $scope.teams[index].title;

                $mdDialog.show({
                    templateUrl: 'templates/blocks/team.delete.html',
                    clickOutsideToClose: true,
                    fullscreen: true,

                    controller: function($scope,$mdDialog) {
                        $scope.team = teamName;

                        $scope.hide = function() {
                            $mdDialog.hide();
                        };
                        $scope.cancel = function() {
                            $mdDialog.cancel();
                        };
                    }
                })
                .then(function() {

                    Team.delete({id:teamId}).$promise
                        .then(function(response){
                          
                               if (response.message == 'ok') {
                                    $scope.teams.splice(index,1);

                                     $mdToast.show(
                                        $mdToast.simple()
                                            .textContent('Team deleted successfully!')
                                            .position('top right')
                                            .hideDelay(3000)
                                    );
                               }
                        })
                    

                },function() {
                    //dialog canceled
                })
            }

            $scope.updateSuperTeam = function(index) {
                var team = $scope.teams[index];
                // console.log(team);

                Team.update({id:team._id},{superTeam: team.superTeam}).$promise
                .then(function(response) {
                    if (response.team) {
                        $mdToast.show(
                            $mdToast.simple()
                                .textContent('Team setting saved!')
                                .position('top right')
                                .hideDelay(3000)
                        );

                    } else {
                         $mdToast.show(
                            $mdToast.simple()
                                .textContent('Sorry! Cannot save team setting!')
                                .position('top right')
                                .hideDelay(3000)
                        );
                    }
                })

            }





            function AddTeamDialogController($scope, $mdDialog, Team, user) {
                $scope.newTeam = {};
                $scope.newTeam.admin = user._id;

                $scope.hide = function() {
                    $mdDialog.hide();
                };
                $scope.cancel = function() {
                    $mdDialog.cancel();
                };

                $scope.checkSubdomain = function() {
                    var params = {subdomain: $scope.newTeam.subdomain};
                    if ($scope.newTeam.subdomain == 'app' ) {
                         $scope.vm.teamForm.subdomain.$setValidity('unique', false);
                         return; 
                    }
                    Team.search(params)
                    .$promise.then(function(data) { 

                        if (data.length == 0) {

                            if (/^[a-z0-9]*$/.test($scope.newTeam.subdomain)) {
                                $scope.vm.teamForm.subdomain.$setValidity('unique', true);
                                $scope.vm.teamForm.subdomain.$setValidity('pattern', true);
                            } else {
                                $scope.vm.teamForm.subdomain.$setValidity('unique', true);
                                $scope.vm.teamForm.subdomain.$setValidity('pattern', false);
                            }
    
                        } else {
                            $scope.vm.teamForm.subdomain.$setValidity('unique', false);
                        }
                    }, function(err) {})
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

                        $mdDialog.hide(team);

                    }, function(err) {
                        $mdToast.show(
                            $mdToast.simple()
                            .textContent(err.message)
                            .position('top right')
                            .hideDelay(3000)
                        )
                    })
                }
            }


            $scope.signInWithTeam = function($index) {
                var changeToTeam = $scope.teams[$index];
                AuthService.switchTeam(changeToTeam._id)
                .then(function() {
                    $scope.$parent.team = AuthService.currentTeam();
                    $scope.$parent.user = AuthService.currentUser();
                    $mdToast.show(
                        $mdToast.simple()
                            .textContent('Switched to ' + changeToTeam.title)
                            .position('top right')
                            .hideDelay(3000)
                    );

                })
            }

    }]);
