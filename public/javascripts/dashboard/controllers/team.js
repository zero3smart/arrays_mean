angular
    .module('arraysApp')
    .controller('TeamCtrl', ['$scope', '$state', 'AuthService','Team','$mdToast','$mdDialog',
        function ($scope, $state, AuthService,Team,$mdToast,$mdDialog) {

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
                });
            };

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
                    if ($scope.newTeam.subdomain == 'blog' || $scope.newTeam.subdomain == 'explore') {
                         $scope.vm.teamForm.subdomain.$setValidity('unique', false);
                         return; 
                    }
                    Team.search(params)
                    .$promise.then(function(data) { 

                        if (data.length == 0) {
                            if (/^[a-z0-9\-]*$/.test($scope.newTeam.subdomain)) {
                                $scope.vm.teamForm.subdomain.$setValidity('unique', true);
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
