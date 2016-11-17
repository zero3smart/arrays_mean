angular.module('arraysApp')
    .controller('DatasetListCtrl', ['$scope', '$mdDialog', '$state', 'datasets',
        function ($scope, $mdDialog, $state, datasets) {

            $scope.$parent.$parent.doc = {};
            $scope.$parent.$parent.title = "Dataset Settings";
            $scope.datasets = datasets;

            $scope.removeDataset = function () {
                var confirm = $mdDialog.confirm()
                    .title('Are you sure to delete the dataset?')
                    .textContent('Dataset will be deleted permanently.')
                    .targetEvent(event)
                    .ok('Yes')
                    .cancel('No');
                $mdDialog.show(confirm).then(function () {
                    // DatasetService.removeDataset().then();
                    console.log('Dataset deleted successfully!');
                }, function () {
                    console.log('You decided to keep your dataset.');
                });
            }

            $scope.selectDataset = function (id) {
                $scope.$parent.$parent.doc_id = id;
                $state.go('admin.dataset.settings');
            }
        }]
    );