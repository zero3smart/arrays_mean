angular.module('arraysApp')
    .controller('DatasetListCtrl', ['$scope', '$mdDialog', '$state', '$mdToast', 'DatasetService', 'datasets', 
        function ($scope, $mdDialog, $state, $mdToast, DatasetService, datasets) {

            $scope.primaryAction.disabled = false;
            $scope.primaryAction.text = 'New Visualization';

            $scope.$parent.$parent.dataset = {};
            $scope.datasets = datasets;

            /* Code for limiting # of datasets based on subscription quantity (keeping for later) */
            /*// Get subscription quantity to limit number of datasets
            if ($scope.$parent.team && $scope.$parent.team.subscription && $scope.$parent.team.subscription.quantity) {
                $scope.subscriptionQuantity = parseInt($scope.$parent.team.subscription.quantity);
            } else {
                $scope.subscriptionQuantity = 0;
            }

            // Filter out sample datasets from subscription count
            $scope.filteredDatasets = datasets.filter(function(dataset) {
                return dataset.sample === false;
            });

            if ($scope.$parent.user === 'superAdmin' || $scope.$parent.team.superTeam === true) {
                $scope.primaryAction.disabled = false;
            } else {
                $scope.primaryAction.disabled = $scope.subscriptionQuantity > $scope.filteredDatasets.length ? false : true; // limit based on billing
            }*/

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
