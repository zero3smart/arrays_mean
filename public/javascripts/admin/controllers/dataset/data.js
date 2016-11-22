angular.module('arraysApp')
    .controller('DatasetDataCtrl', ['$scope', 'DatasetService', '$mdToast', '$mdDialog', 'dataset', 'availableTypeCoercions',
        function($scope, DatasetService, $mdToast, $mdDialog, dataset, availableTypeCoercions) {

            // Assert some of the fields should be available
            if (!dataset.raw_rowObjects_coercionScheme) dataset.raw_rowObjects_coercionScheme = {};
            if (!dataset.fe_excludeFields) dataset.fe_excludeFields = {};

            $scope.$parent.$parent.dataset = angular.copy(dataset);
            $scope.$parent.$parent.currentNavItem = 'Data';
            $scope.availableTypeCoercions = availableTypeCoercions;

            $scope.openFieldDialog = function(ev, fieldName, firstRecord) {
                $mdDialog.show({
                    controller: DialogController,
                    templateUrl: 'templates/dataset/data.field.html',
                    parent: angular.element(document.body),
                    targetEvent: ev,
                    clickOutsideToClose:true,
                    fullscreen: true, // Only for -xs, -sm breakpoints.
                    locals: {
                        fieldName: fieldName,
                        firstRecord: firstRecord,
                        dataset: dataset,
                        availableTypeCoercions: availableTypeCoercions
                    }
                })
                    .then(function(savedDataset) {
                        // Merge savedDataset into dataset

                    }, function() {
                        console.log('You cancelled the dialog.');
                    });
            };

            function DialogController($scope, $mdDialog, fieldName, firstRecord, dataset, availableTypeCoercions) {
                $scope.fieldName = fieldName;
                $scope.firstRecord = firstRecord;
                $scope.dataset = angular.copy(dataset);
                $scope.availableTypeCoercions = availableTypeCoercions;

                $scope.reset = function() {
                    $scope.dataset = angular.copy(dataset);
                };

                $scope.cancel = function() {
                    $mdDialog.cancel();
                };

                $scope.save = function() {
                    $mdDialog.hide($scope.dataset);
                };
            }

            $scope.reset = function() {
                $scope.$parent.$parent.dataset = angular.copy(dataset)
            };

            $scope.submitForm = function(isValid) {
                if (isValid) {
                    DatasetService.save($scope.$parent.$parent.dataset)
                        .then(function() {
                            $mdToast.show(
                                $mdToast.simple()
                                    .textContent('Dataset updated successfully!')
                                    .position('top right')
                                    .hideDelay(3000)
                            );

                            $state.transitionTo('admin.dataset.views', {id: id}, { reload: true, inherit: false, notify: true });
                        }, function(error) {
                            $mdToast.show(
                                $mdToast.simple()
                                    .textContent(error)
                                    .position('top right')
                                    .hideDelay(5000)
                            );
                        });
                }
            }

        }
    ]);