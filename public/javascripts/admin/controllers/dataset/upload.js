angular.module('arraysApp')
    .controller('DatasetUploadCtrl', ['$scope', 'dataset',
        function($scope, dataset) {

            $scope.$parent.$parent.dataset = dataset;
        }
    ]);