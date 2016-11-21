angular.module('arraysApp')
    .controller('DatasetDoneCtrl', ['$scope', 'dataset',
        function($scope, dataset) {

            $scope.$parent.$parent.dataset = dataset;
            $scope.$parent.$parent.currentNavItem = 'Done';

        }
    ]);