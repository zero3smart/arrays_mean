angular.module('arraysApp')
    .controller('DatasetListCtrl', ['$scope', '$mdDialog', '$state', 'DatasetService', 'datasets',
        function ($scope, $mdDialog, $state, DatasetService, datasets) {

            $scope.$parent.$parent.dataset = {};
            $scope.datasets = datasets;

            $scope.remove = function (id) {
                $scope.$parent.$parent.error = null;
                $scope.$parent.$parent.message = null;

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
                            $scope.$parent.$parent.error = 'Dataset deleted successfully!';
                        } else if (typeof message === 'string') {
                            $scope.$parent.$parent.error = message;
                        }
                    }, function(error) {
                        $scope.$parent.$parent.error = message;
                    });
                }, function () {
                    console.log('You decided to keep your dataset.');
                });
            }

            $scope.select = function (id) {
                $state.go('admin.dataset.settings', {id: id});
            }
        }]
    );