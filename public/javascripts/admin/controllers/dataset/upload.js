angular.module('arraysApp')
    .controller('DatasetUploadCtrl', ['$scope', 'dataset', 'angularFileUpload',
        function($scope, dataset, angularFileUpload) {

            $scope.$parent.$parent.dataset = dataset;
            $scope.$parent.$parent.currentNavItem = 'Upload';

            $scope.upload = function() {

            }
        }
    ]);