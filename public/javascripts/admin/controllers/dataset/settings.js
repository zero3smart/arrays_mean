angular.module('arraysApp')
    .controller('DatasetSettingsCtrl', ['$scope', '$state', 'dataset', 'DatasetService', '$mdToast',
        function($scope, $state, dataset, DatasetService, $mdToast) {

            $scope.$parent.$parent.dataset = dataset;
            $scope.$parent.$parent.currentNavItem = 'Settings';

            $scope.submitForm = function(isValid) {
                if (isValid) {
                    $scope.submitting = true;
                    DatasetService.save(dataset).then(function(result) {
                        if (result === true) {
                            $mdToast.show(
                                $mdToast.simple()
                                    .textContent('Dataset updated successfully!')
                                    .position('top right')
                                    .hideDelay(5000)
                            );

                            $state.go('admin.dataset.upload', {id: dataset._id});
                        }
                        $scope.submitting = false;
                    }, function(error) {
                        $mdToast.show(
                            $mdToast.simple()
                                .textContent(error)
                                .position('top right')
                                .hideDelay(5000)
                        );
                        $scope.submitting = false;
                    });
                }
            }
        }
    ]);