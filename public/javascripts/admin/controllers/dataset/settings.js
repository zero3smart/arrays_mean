angular.module('arraysApp')
    .controller('DatasetSettingsCtrl', ['$scope', '$state', 'dataset', 'DatasetService', '$mdToast',
        function($scope, $state, dataset, DatasetService, $mdToast) {

            $scope.$parent.$parent.dataset = dataset;
            $scope.$parent.$parent.currentNavItem = 'Settings';

            $scope.submitForm = function(isValid) {
                if (isValid) {
                    $scope.submitting = true;
                    DatasetService.save(dataset).then(function(id) {
                        $mdToast.show(
                            $mdToast.simple()
                                .textContent(dataset._id ? 'Dataset updated successfully!' : 'New Dataset was created successfully!')
                                .position('top right')
                                .hideDelay(3000)
                        );

                        $state.transitionTo('admin.dataset.upload', {id: id}, { reload: true, inherit: false, notify: true });
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