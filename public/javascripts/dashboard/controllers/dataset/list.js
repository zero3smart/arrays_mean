angular.module('arraysApp')
    .controller('DatasetListCtrl', ['$scope', '$mdDialog', '$state', '$mdToast', 'DatasetService', 'datasets', 'nullDatasets',
        function ($scope, $mdDialog, $state, $mdToast, DatasetService, datasets, nullDatasets) {

            $scope.$parent.$parent.dataset = {};
            $scope.datasets = datasets;

            $scope.primaryAction.text = 'New Dataset';
            $scope.primaryAction.disabled = false; // can limit here based on billing
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

            // remove abandoned datasets (have no uid)
            for (var i = 0; i < nullDatasets.length; i++) {
                var null_id = nullDatasets[i]._id;
                DatasetService.remove(null_id).then(function(response) {
                    // console.log('Dataset without uid removed');
                }, function(error) {
                    // console.log(error);
                });
            }

        }]);
