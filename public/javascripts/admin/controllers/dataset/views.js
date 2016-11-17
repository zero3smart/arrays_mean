angular.module('arraysApp')
    .controller('DatasetViewsCtrl', ['$scope', 'dataset',
        function($scope, dataset) {

            $scope.$parent.$parent.dataset = dataset;

        }
    ]);