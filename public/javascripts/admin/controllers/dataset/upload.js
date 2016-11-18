angular.module('arraysApp')
    .controller('DatasetUploadCtrl', ['$scope', 'dataset',
        function($scope, dataset) {

            $scope.$parent.$parent.dataset = dataset;
            $scope.$parent.$parent.currentNavItem = 'Upload';
        }
    ]);