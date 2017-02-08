angular.module('arraysApp')
    .controller('DatasetListCtrl', ['$scope', '$mdDialog', '$state', '$mdToast', 'DatasetService', 'datasets', 'team',
        function ($scope, $mdDialog, $state, $mdToast, DatasetService, datasets, team) {


            // Get subscription quantity to limit number of datasets
            if (team && team.subscription && team.subscription.quantity) {
                $scope.subscriptionQuantity = parseInt(team.subscription.quantity);
            } else {
                $scope.subscriptionQuantity = 0;
            }

            $scope.$parent.$parent.dataset = {};
            $scope.datasets = datasets;


            $scope.primaryAction.text = 'New Visualization';
            $scope.primaryAction.disabled = $scope.subscriptionQuantity > $scope.datasets.length ? false : true; // limit based on billing
            $scope.primaryAction.do = function() {
                $scope.add();
            };

            $scope.remove = function (id, title, ev) {
                $mdDialog.show({
                    templateUrl: 'templates/blocks/dataset.delete.html',
                    parent: angular.element(document.body),
                    targetEvent: ev,
                    clickOutsideToClose: true,
                    fullscreen: true,
                    locals: {
                        title: title,
                    },
                    controller: function($scope, $mdDialog) {
                        $scope.title = title;
                        $scope.hide = function() {
                            $mdDialog.hide();
                        };
                        $scope.cancel = function() {
                            $mdDialog.cancel();
                        };
                    }
                })
                .then(function () {
                    DatasetService.remove(id).then(function(response) {
                        if (response.status === 200) {
                            $scope.datasets = $scope.datasets.filter(function(a) {
                                return a._id !== id;
                            });
                            $mdToast.show(
                                $mdToast.simple()
                                    .textContent('Dataset deleted successfully!')
                                    .position('top right')
                                    .hideDelay(3000)
                            );
                        }
                    }, function(error) {
                        $mdToast.show(
                            $mdToast.simple()
                                .textContent(error)
                                .position('top right')
                                .hideDelay(3000)
                        );
                    });
                }, function () {
                    // console.log('You decided to keep your dataset.');
                });
            };


            $scope.select = function (id) {


                $state.go('dashboard.dataset.upload', {id: id});
            };

            $scope.add = function() {
                $state.go('dashboard.dataset.new');
            };



        }]);
