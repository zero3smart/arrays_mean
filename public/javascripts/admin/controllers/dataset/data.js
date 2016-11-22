angular.module('arraysApp')
    .controller('DatasetDataCtrl', ['$scope', 'DatasetService', '$mdToast', '$mdDialog', '$filter', 'dataset', 'availableTypeCoercions', 'availableDesignatedFields',
        function ($scope, DatasetService, $mdToast, $mdDialog, $filter, dataset, availableTypeCoercions, availableDesignatedFields) {

            // Assert some of the fields should be available
            if (!dataset.raw_rowObjects_coercionScheme) dataset.raw_rowObjects_coercionScheme = {};
            if (!dataset.fe_excludeFields) dataset.fe_excludeFields = {};

            $scope.$parent.$parent.dataset = angular.copy(dataset);
            $scope.$parent.$parent.currentNavItem = 'Data';

            $scope.availableTypeCoercions = availableTypeCoercions;

            $scope.openFieldDialog = function (evt, fieldName, firstRecord) {
                $mdDialog.show({
                    controller: FieldDialogController,
                    templateUrl: 'templates/dataset/data.field.html',
                    parent: angular.element(document.body),
                    targetEvent: evt,
                    clickOutsideToClose: true,
                    fullscreen: true, // Only for -xs, -sm breakpoints.
                    locals: {
                        fieldName: fieldName,
                        firstRecord: firstRecord,
                        dataset: $scope.$parent.$parent.dataset,
                        availableTypeCoercions: availableTypeCoercions,
                        availableDesignatedFields: availableDesignatedFields
                    }
                })
                    .then(function (savedDataset) {
                        $scope.$parent.$parent.dataset = savedDataset;
                    }, function () {
                        console.log('You cancelled the dialog.');
                    });
            };

            function FieldDialogController($scope, $mdDialog, $filter, fieldName, firstRecord, dataset, availableTypeCoercions, availableDesignatedFields) {

                $scope.fieldName = fieldName;
                $scope.finalizedFieldName = $filter('dotless')(fieldName);
                $scope.firstRecord = firstRecord;

                $scope.availableTypeCoercions = availableTypeCoercions;
                $scope.availableDesignatedFields = availableDesignatedFields;

                $scope.reset = function () {
                    $scope.dataset = angular.copy(dataset);

                    $scope.data = {};

                    // General
                    if (!$scope.dataset.fe_designatedFields) $scope.dataset.fe_designatedFields = {};
                    for (var key in $scope.dataset.fe_designatedFields) {
                        if ($scope.dataset.fe_designatedFields[key] == $scope.finalizedFieldName) {
                            $scope.data.designatedField = key;
                            break;
                        }
                    }

                    if (!$scope.dataset.fe_fieldDisplayOrder) $scope.dataset.fe_fieldDisplayOrder = [];
                    var index = $scope.dataset.fe_fieldDisplayOrder.indexOf($scope.finalizedFieldName);
                    if (index != -1) $scope.data.displayOrder = index;

                    // Filter
                    if (!$scope.dataset.fe_filters.fieldsNotAvailable) $scope.dataset.fe_filters.fieldsNotAvailable = [];
                    $scope.data.filterNotAvailable = $scope.dataset.fe_filters.fieldsNotAvailable.indexOf($scope.finalizedFieldName) != -1;

                    if (!$scope.dataset.fe_filters.fieldsCommaSeparatedAsIndividual) $scope.dataset.fe_filters.fieldsCommaSeparatedAsIndividual = [];
                    $scope.data.commaSeparatedAsIndividual = $scope.dataset.fe_filters.fieldsCommaSeparatedAsIndividual.indexOf($scope.finalizedFieldName) != -1;

                    if (!$scope.dataset.fe_filters.fieldsMultiSelectable) $scope.dataset.fe_filters.fieldsMultiSelectable = [];
                    $scope.data.multipleSelection = $scope.dataset.fe_filters.fieldsMultiSelectable.indexOf($scope.finalizedFieldName) != -1;

                    if (!$scope.dataset.fe_filters.fieldsSortableByInteger) $scope.dataset.fe_filters.fieldsSortableByInteger = [];
                    $scope.data.sortableByInt = $scope.dataset.fe_filters.fieldsSortableByInteger.indexOf($scope.finalizedFieldName) != -1;

                    if (!$scope.dataset.fe_filters.fieldsSortableInReverseOrder) $scope.dataset.fe_filters.fieldsSortableInReverseOrder = [];
                    $scope.data.sortableInReverse = $scope.dataset.fe_filters.fieldsSortableInReverseOrder.indexOf($scope.finalizedFieldName) != -1;

                    if (!$scope.dataset.fe_filters.oneToOneOverrideWithValuesByTitleByFieldName) $scope.dataset.fe_filters.oneToOneOverrideWithValuesByTitleByFieldName = {};

                    if (!$scope.dataset.fe_filters.valuesToExcludeByOriginalKey) $scope.dataset.fe_filters.valuesToExcludeByOriginalKey = {};

                    if (!$scope.dataset.fe_filters.keywords) $scope.dataset.fe_filters.keywords = [];
                    $scope.data.keywords = $scope.dataset.fe_filters.keywords.find(function (elem) {
                        return elem.title == $scope.finalizedFieldName;
                    });
                    if (!$scope.data.keywords) $scope.data.keywords = {title: $scope.finalizedFieldName, choices: []};

                    // Nested
                };

                $scope.reset();

                $scope.removeOneToOneOverride = function (valueByOverride) {
                    $scope.dataset.fe_filters.oneToOneOverrideWithValuesByTitleByFieldName[$scope.finalizedFieldName] =
                        $scope.dataset.fe_filters.oneToOneOverrideWithValuesByTitleByFieldName[$scope.finalizedFieldName].filter(function (elem) {
                            return elem.value != valueByOverride.value;
                        });
                };

                $scope.addOneToOneOverride = function () {
                    if (!$scope.dataset.fe_filters.oneToOneOverrideWithValuesByTitleByFieldName[$scope.finalizedFieldName])
                        $scope.dataset.fe_filters.oneToOneOverrideWithValuesByTitleByFieldName[$scope.finalizedFieldName] = [];
                    var emptyElem = $scope.dataset.fe_filters.oneToOneOverrideWithValuesByTitleByFieldName[$scope.finalizedFieldName].find(function (elem) {
                        return elem.value == '';
                    });
                    if (!emptyElem) $scope.dataset.fe_filters.oneToOneOverrideWithValuesByTitleByFieldName[$scope.finalizedFieldName].push({
                        override: '',
                        value: ''
                    });
                };

                $scope.fabricatedChoicesFilter = function(value, index, array) {
                    return function(item) {
                        return item.choices[0].match.field == 'rowParams.' + $scope.finalizedFieldName;
                    };
                };

                $scope.addFabricated = function() {
                    // dataset.fe_filters.fabricated
                };

                $scope.removeFabricated = function(fabricated) {

                };

                $scope.cancel = function () {
                    $mdDialog.cancel();
                };

                $scope.save = function () {
                    // General
                    if ($scope.data.designatedField != undefined)
                        $scope.dataset.fe_designatedFields[$scope.data.designatedField] = $scope.finalizedFieldName;
                    else {
                        for (var key in $scope.dataset.fe_designatedFields) {
                            if ($scope.dataset.fe_designatedFields[key] == $scope.finalizedFieldName) {
                                delete $scope.dataset[key];
                                break;
                            }
                        }
                    }

                    var index = $scope.dataset.fe_fieldDisplayOrder.indexOf($scope.finalizedFieldName);
                    if (index != -1) $scope.dataset.fe_fieldDisplayOrder.splice(index, 1);
                    if ($scope.data.displayOrder) {
                        // TODO: Consider to shift the existing elements at the same position?
                        $scope.dataset.fe_fieldDisplayOrder.splice($scope.data.displayOrder, 0, $scope.finalizedFieldName);
                    }

                    // Filter
                    index = $scope.dataset.fe_filters.fieldsNotAvailable.indexOf($scope.finalizedFieldName);
                    if (index != -1) $scope.dataset.fe_filters.fieldsNotAvailable.splice(index, 1);
                    if ($scope.data.filterNotAvailable) {
                        $scope.dataset.fe_filters.fieldsNotAvailable.push($scope.finalizedFieldName);
                    }

                    index = $scope.dataset.fe_filters.fieldsCommaSeparatedAsIndividual.indexOf($scope.finalizedFieldName);
                    if (index != -1) $scope.dataset.fe_filters.fieldsCommaSeparatedAsIndividual.splice(index, 1);
                    if ($scope.data.commaSeparatedAsIndividual) {
                        $scope.dataset.fe_filters.fieldsCommaSeparatedAsIndividual.push($scope.finalizedFieldName);
                    }

                    index = $scope.dataset.fe_filters.fieldsMultiSelectable.indexOf($scope.finalizedFieldName);
                    if (index != -1) $scope.dataset.fe_filters.fieldsMultiSelectable.splice(index, 1);
                    if ($scope.data.multipleSelection) {
                        $scope.dataset.fe_filters.fieldsMultiSelectable.push($scope.finalizedFieldName);
                    }

                    index = $scope.dataset.fe_filters.fieldsSortableByInteger.indexOf($scope.finalizedFieldName);
                    if (index != -1) $scope.dataset.fe_filters.fieldsSortableByInteger.splice(index, 1);
                    if ($scope.data.sortableByInt) {
                        $scope.dataset.fe_filters.fieldsSortableByInteger.push($scope.finalizedFieldName);
                    }

                    index = $scope.dataset.fe_filters.fieldsSortableInReverseOrder.indexOf($scope.finalizedFieldName);
                    if (index != -1) $scope.dataset.fe_filters.fieldsSortableInReverseOrder.splice(index, 1);
                    if ($scope.data.sortableInReverse) {
                        $scope.dataset.fe_filters.fieldsSortableInReverseOrder.push($scope.finalizedFieldName);
                    }

                    if ($scope.dataset.fe_filters.oneToOneOverrideWithValuesByTitleByFieldName[$scope.finalizedFieldName]) {
                        $scope.dataset.fe_filters.oneToOneOverrideWithValuesByTitleByFieldName[$scope.finalizedFieldName] =
                            $scope.dataset.fe_filters.oneToOneOverrideWithValuesByTitleByFieldName[$scope.finalizedFieldName].filter(function (elem) {
                                return elem.value != '' || elem.override != '';
                            });
                        if ($scope.dataset.fe_filters.oneToOneOverrideWithValuesByTitleByFieldName[$scope.finalizedFieldName].length == 0)
                            delete $scope.dataset.fe_filters.oneToOneOverrideWithValuesByTitleByFieldName[$scope.finalizedFieldName];
                    }

                    $scope.dataset.fe_filters.keywords = $scope.dataset.fe_filters.keywords.filter(function (elem) {
                        return elem.title != $scope.finalizedFieldName;
                    });
                    if ($scope.data.keywords.choices.length > 0) $scope.dataset.fe_filters.keywords = $scope.dataset.fe_filters.keywords.concat($scope.data.keywords);

                    // Nested

                    $mdDialog.hide($scope.dataset);
                };
            }

            $scope.reset = function () {
                $scope.$parent.$parent.dataset = angular.copy(dataset)
            };

            $scope.submitForm = function (isValid) {
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