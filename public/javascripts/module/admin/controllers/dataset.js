angular.module('arraysApp')
    .controller('datasetCtrl', ['$scope', '$mdDialog', 'dataset',
        function($scope, $mdDialog, dataset) {
            $scope.doc = {};

            $scope.init = function() {
                $scope.doc = {};
                $scope.title = "Dataset Settings";
                dataset.getAll().then(function(docs) {
                    $scope.docs = docs;
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
                    console.log('Record deleted successfully!');
                }, function() {
                    console.log('You decided to keep your record.');
                });
            }
        }]
    );