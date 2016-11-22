angular.module('arraysApp')
    .controller('DatasetDoneCtrl', ['$scope', 'dataset', 'DatasetService',
        function($scope, dataset, DatasetService) {

            $scope.$parent.$parent.dataset = dataset;
            $scope.$parent.$parent.currentNavItem = 'Done';

            $scope.importData = function() {
                DatasetService.importData(dataset.dataset_uid | dataset.uid);
            }
        }
    ]);