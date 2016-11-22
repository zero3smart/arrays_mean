angular.module('arraysApp')
    .controller('DatasetDataCtrl', ['$scope', 'DatasetService', '$mdToast', '$mdDialog', '$filter', 'dataset', 'availableTypeCoercions', 'availableDesignatedFields',
        function($scope, DatasetService, $mdToast, $mdDialog, $filter, dataset, availableTypeCoercions, availableDesignatedFields) {

            // Assert some of the fields should be available
            if (!dataset.raw_rowObjects_coercionScheme) dataset.raw_rowObjects_coercionScheme = {};
            if (!dataset.fe_excludeFields) dataset.fe_excludeFields = {};

            $scope.$parent.$parent.dataset = angular.copy(dataset);
            $scope.$parent.$parent.currentNavItem = 'Data';

            $scope.availableTypeCoercions = availableTypeCoercions;

            $scope.openFieldDialog = function(evt, fieldName, firstRecord) {
                $mdDialog.show({
                    controller: DialogController,
                    templateUrl: 'templates/dataset/data.field.html',
                    parent: angular.element(document.body),
                    targetEvent: evt,
                    clickOutsideToClose:true,
                    // fullscreen: true, // Only for -xs, -sm breakpoints.
                    locals: {
                        fieldName: fieldName,
                        firstRecord: firstRecord,
                        dataset: $scope.$parent.$parent.dataset,
                        availableTypeCoercions: availableTypeCoercions,
                        availableDesignatedFields: availableDesignatedFields
                    }
                })
                    .then(function(savedDataset) {
                        $scope.$parent.$parent.dataset = savedDataset;
                    }, function() {
                        console.log('You cancelled the dialog.');
                    });
            };

            function DialogController($scope, $mdDialog, $filter, fieldName, firstRecord, dataset, availableTypeCoercions, availableDesignatedFields) {
                $scope.fieldName = fieldName;
                $scope.finalizedFieldName = $filter('dotless')(fieldName);
                $scope.firstRecord = firstRecord;

                $scope.availableTypeCoercions = availableTypeCoercions;
                $scope.availableDesignatedFields = availableDesignatedFields;

                $scope.reset = function() {
                    $scope.dataset = angular.copy(dataset);

                    for (var key in dataset.fe_designatedFields) {
                        if (dataset.fe_designatedFields[key] == $scope.finalizedFieldName)
                            $scope.designatedField = key;
                    }
                };

                $scope.reset();

                $scope.cancel = function() {
                    $mdDialog.cancel();
                };

                $scope.save = function() {
                    $scope.dataset.fe_designatedFields[$scope.designatedField] = $scope.finalizedFieldName;

                    $mdDialog.hide($scope.dataset);
                };
            }

            $scope.reset = function() {
                $scope.$parent.$parent.dataset = angular.copy(dataset)
            };

            $scope.submitForm = function(isValid) {
                if (isValid) {
                    console.log($scope.$parent.$parent.dataset);

                    /* DatasetService.save($scope.$parent.$parent.dataset)
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
                        }); */
                }
            }

        }
    ]);