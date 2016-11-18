angular.module('arraysApp')
    .controller('DatasetListCtrl', ['$scope', '$mdDialog', '$state', '$mdToast', 'DatasetService', 'datasets',
        function ($scope, $mdDialog, $state, $mdToast, DatasetService, datasets) {

            $scope.$parent.$parent.dataset = {};
            $scope.datasets = datasets;

            $scope.remove = function (id) {
                var confirm = $mdDialog.confirm()
                    .title('Are you sure to delete the dataset?')
                    .textContent('Dataset will be deleted permanently.')
                    .targetEvent(event)
                    .ok('Yes')
                    .cancel('No');
                $mdDialog.show(confirm).then(function () {
                    DatasetService.remove(id).then(function(message) {
                        if (message === true) {
                            $scope.datasets = $scope.datasets.filter(function(a) {
                                return a._id !== id;
                            });
                            $mdToast.show(
                                $mdToast.simple()
                                    .textContent('Dataset deleted successfully!')
                                    .position('top right')
                                    .hideDelay(5000)
                            );
                        } else if (typeof message === 'string') {
                            $mdToast.show(
                                $mdToast.simple()
                                    .textContent('<span class="error">' + message + '</span>')
                                    .position('top right')
                                    .hideDelay(5000)
                            );
                        }
                    }, function(error) {
                        $mdToast.show(
                            $mdToast.simple()
                                .textContent('<span class="error">' + error + '</span>')
                                .position('top right')
                                .hideDelay(5000)
                        );
                    });
                }, function () {
                    console.log('You decided to keep your dataset.');
                });
            }

            $scope.select = function (id) {
                $state.go('admin.dataset.settings', {id: id});
            }

            $scope.add = function() {
                $state.go('admin.dataset.settings');
            }
        }]
    );