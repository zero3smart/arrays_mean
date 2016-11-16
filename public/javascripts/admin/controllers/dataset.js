angular.module('arraysApp')
    .controller('datasetCtrl', ['$scope', '$mdDialog', 'dataset', '$state',
        function($scope, $mdDialog, dataset, $state) {
            $scope.doc = {};

            $scope.init = function() {
                $scope.doc = {};
                $scope.title = "Dataset Settings";
                dataset.getAll().then(function(docs) {
                    $scope.docs = docs;
                    console.log($scope.docs);
                }, function(err) {
                    $scope.error = err;
                });
            }

            $scope.removeDataset = function() {
                var confirm = $mdDialog.confirm()
                    .title('Are you sure to delete the dataset?')
                    .textContent('Dataset will be deleted permanently.')
                    .targetEvent(event)
                    .ok('Yes')
                    .cancel('No');
                $mdDialog.show(confirm).then(function() {
                    console.log('Dataset deleted successfully!');
                }, function() {
                    console.log('You decided to keep your dataset.');
                });
            }

            $scope.selectDataset = function(id) {
                $state.go('admin.dataset.settings');
            }
        }]
    );