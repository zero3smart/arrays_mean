angular.module('arraysApp')
    .controller('DatasetSettingsCtrl', ['$scope', '$state', 'dataset', 'DatasetService',
        function($scope, $state, dataset, DatasetService) {

            $scope.$parent.$parent.dataset = dataset;
            $scope.$parent.$parent.currentNavItem = 'Settings';

            $scope.submitForm = function(isValid) {
                if (isValid) {
                    $scope.submitting = true;
                    // DatasetService.save();
                    // $state.go('admin.dataset.upload', {id: dataset._id});
                }
            }
        }
    ]);