angular.module('arraysApp')
    .controller('FieldDialogCtrl',['$scope','$mdDialog','$filter','fieldName','firstRecord','dataset',
    	'availableTypeCoercions','custom','customFieldIndex','filterOnly', function($scope, $mdDialog, $filter, fieldName, firstRecord, dataset, availableTypeCoercions, 
    		custom, customFieldIndex, filterOnly) {

		$scope.firstRecord = firstRecord;
        $scope.availableTypeCoercions = availableTypeCoercions;
        $scope.custom = custom;
        $scope.customFieldIndex = customFieldIndex;

        var originalFieldName = fieldName;

        var originalCoercionScheme = dataset.raw_rowObjects_coercionScheme[fieldName];

      
        function refreshFieldByName(name) {
            // General
            if (!$scope.dataset.fe_fieldDisplayOrder) $scope.dataset.fe_fieldDisplayOrder = [];
            var index = $scope.dataset.fe_fieldDisplayOrder.indexOf(name);
            if (index != -1) $scope.data.displayOrder = index;

            // Filter
            if (!$scope.dataset.fe_filters.fieldsNotAvailable) $scope.dataset.fe_filters.fieldsNotAvailable = [];
            $scope.data.filterNotAvailable = $scope.dataset.fe_filters.fieldsNotAvailable.indexOf(name) != -1;

            if (!$scope.dataset.fe_filters.fieldsCommaSeparatedAsIndividual) $scope.dataset.fe_filters.fieldsCommaSeparatedAsIndividual = [];
            $scope.data.commaSeparatedAsIndividual = $scope.dataset.fe_filters.fieldsCommaSeparatedAsIndividual.indexOf(name) != -1;

            if (!$scope.dataset.fe_filters.fieldsMultiSelectable) $scope.dataset.fe_filters.fieldsMultiSelectable = [];
            $scope.data.multipleSelection = $scope.dataset.fe_filters.fieldsMultiSelectable.indexOf(name) != -1;

            if (!$scope.dataset.fe_filters.fieldsSortableByInteger) $scope.dataset.fe_filters.fieldsSortableByInteger = [];
            $scope.data.sortableByInt = $scope.dataset.fe_filters.fieldsSortableByInteger.indexOf(name) != -1;

            if (!$scope.dataset.fe_filters.fieldsSortableInReverseOrder) $scope.dataset.fe_filters.fieldsSortableInReverseOrder = [];
            $scope.data.sortableInReverse = $scope.dataset.fe_filters.fieldsSortableInReverseOrder.indexOf(name) != -1;

            if (!$scope.dataset.fe_filters.oneToOneOverrideWithValuesByTitleByFieldName) $scope.dataset.fe_filters.oneToOneOverrideWithValuesByTitleByFieldName = {};

            if (!$scope.dataset.fe_filters.valuesToExcludeByOriginalKey) $scope.dataset.fe_filters.valuesToExcludeByOriginalKey = {};
            if (!$scope.dataset.fe_filters.valuesToExcludeByOriginalKey[name] && $scope.customFieldIndex == undefined)
                $scope.dataset.fe_filters.valuesToExcludeByOriginalKey[name] = [];
            if (!$scope.dataset.fe_filters.valuesToExcludeByOriginalKey._all)
                $scope.dataset.fe_filters.valuesToExcludeByOriginalKey._all = [];

            if (!$scope.dataset.fe_filters.keywords) $scope.dataset.fe_filters.keywords = [];
            $scope.data.keywords = $scope.dataset.fe_filters.keywords.find(function (elem) {
                return elem.title == name;
            });
            if (!$scope.data.keywords) $scope.data.keywords = {title: name, choices: []};

        }

        $scope.reset = function () {

            $scope.dataset = angular.copy(dataset);
            $scope.fieldName = fieldName;

            if ($scope.customFieldIndex != undefined) {
                if (!dataset.customFieldsToProcess)
                    $scope.dataset.customFieldsToProcess = [];
                $scope.customField = $scope.dataset.customFieldsToProcess[customFieldIndex];
                if (!$scope.customField) {
                    $scope.customField = {
                        fieldName: '',
                        fieldType: 'array',
                        fieldsToMergeIntoArray: [],
                        delimiterOnFields: []
                    };
                }
                if (!$scope.customField.delimiterOnFields) $scope.customField.delimiterOnFields = [];

                $scope.fieldName = $scope.customField.fieldName;
            }



            $scope.data = {};

            refreshFieldByName($scope.fieldName);

            // Data Type Coercion

            $scope.coercionScheme = angular.copy($scope.dataset.raw_rowObjects_coercionScheme);

            if ($scope.dialog.fieldForm) $scope.dialog.fieldForm.$setPristine();
        };

        $scope.reset();

        $scope.removeOneToOneOverride = function (valueByOverride) {
            var index = $scope.dataset.fe_filters.oneToOneOverrideWithValuesByTitleByFieldName[fieldName].indexOf(valueByOverride);
            if (index != -1) {
                $scope.dataset.fe_filters.oneToOneOverrideWithValuesByTitleByFieldName[fieldName].splice(index, 1);
                $scope.dialog.fieldForm.$setDirty();
            }
        };

        $scope.addOneToOneOverride = function () {
            if (!$scope.dataset.fe_filters.oneToOneOverrideWithValuesByTitleByFieldName[fieldName])
                $scope.dataset.fe_filters.oneToOneOverrideWithValuesByTitleByFieldName[fieldName] = [];
            var emptyElem = $scope.dataset.fe_filters.oneToOneOverrideWithValuesByTitleByFieldName[fieldName].find(function (elem) {
                return elem.value == '';
            });
            if (!emptyElem) {
                $scope.dataset.fe_filters.oneToOneOverrideWithValuesByTitleByFieldName[fieldName].push({
                    override: '',
                    value: ''
                });
                $scope.dialog.fieldForm.$setDirty();
            }
        };

        $scope.verifyUniqueValueOverride = function (valueOverride, index) {
            var valueOverrideUnique = true, valueOverrideTitleUnique = true;
            $scope.dataset.fe_filters.oneToOneOverrideWithValuesByTitleByFieldName[fieldName].forEach(function (elem) {
                if (valueOverride == elem) return;

                if (valueOverride.value == elem.value) valueOverrideUnique = false;
                if (valueOverride.override == elem.override) valueOverrideTitleUnique = false;
            });

            $scope.dialog.fieldForm['overrideValue_' + index].$setValidity('unique', valueOverrideUnique);
            $scope.dialog.fieldForm['overrideValueTitle_' + index].$setValidity('unique', valueOverrideTitleUnique);
        };




        $scope.changeCoercionSchemeByOperation = function (colName) {




            var coercion = $scope.coercionScheme[colName];

            console.log("here");

            console.log(coercion);
            console.log( $scope.dataset.raw_rowObjects_coercionScheme)




            if (!$scope.dataset.raw_rowObjects_coercionScheme[colName]) {
                $scope.dataset.raw_rowObjects_coercionScheme[colName] = coercion;
                $scope.dialog.fieldForm.$setDirty();

            } else {
                $scope.dataset.raw_rowObjects_coercionScheme[colName].operation = coercion.operation;
                $scope.dialog.fieldForm.$setPristine();
            }

            $scope.dialog.fieldForm.$setDirty();
            
        };

        $scope.cancel = function () {
            $mdDialog.cancel();
        };

        $scope.delete = function () {
            $scope.reset();
            if (customFieldIndex < $scope.dataset.customFieldsToProcess.length) {
                $scope.dataset.customFieldsToProcess.splice(customFieldIndex, 1);
                delete $scope.dataset.fe_excludeFields[$scope.dialog.fieldForm.fieldName.$modelValue];
            }
            $mdDialog.hide($scope.dataset);
        };

        $scope.verifyUniqueFieldName = function(name) {
            refreshFieldByName(name);

            $scope.customField.fieldName = name;

            var unique = ($scope.dataset.columns.find(function(column) {
                return name == column.name;
            }) == undefined);

            if (unique && $scope.dataset.customFieldsToProcess) {
                unique = ($scope.dataset.customFieldsToProcess.find(function(customField, index) {
                    if (index == customFieldIndex) return false;
                    return name == customField.fieldName;
                }) == undefined);
            }

            $scope.dialog.fieldForm.fieldName.$setValidity('unique', unique);
        };

        $scope.setDirty = function(number) {
            if ($scope.dataset.dirty !== 1) {
                $scope.dataset.dirty = number;
            }
        };

        $scope.save = function () {
            // General
    
            if (originalCoercionScheme) {
                if (originalCoercionScheme.operation == 'ToDate' && 
                    originalCoercionScheme.format !== $scope.dataset.raw_rowObjects_coercionScheme[$scope.fieldName].format) {
                    $scope.dataset.dirty = 1;
                } else if (originalCoercionScheme.operation !== $scope.dataset.raw_rowObjects_coercionScheme[$scope.fieldName].operation) {
                    $scope.dataset.dirty = 1;
                }
            } else {
                if ($scope.dataset.raw_rowObjects_coercionScheme[$scope.fieldName]) {
                    $scope.dataset.dirty = 1;
                }
            }

         
            if (!filterOnly) {
                var currentValue = $scope.dialog.fieldForm.fieldName.$modelValue;

                if (originalFieldName !== currentValue) {

                    var originalExclude = $scope.dataset.fe_excludeFields[originalFieldName];
                    $scope.dataset.fe_excludeFields[currentValue] = originalExclude;
                    delete $scope.dataset.fe_excludeFields[originalFieldName];
                }
            }

            var index = $scope.dataset.fe_fieldDisplayOrder.indexOf($scope.fieldName);
            if (index != -1) $scope.dataset.fe_fieldDisplayOrder.splice(index, 1);
            if ($scope.data.displayOrder != undefined) {
                $scope.dataset.fe_fieldDisplayOrder.splice($scope.data.displayOrder, 0, $scope.fieldName);
            }

            // Filter
            index = $scope.dataset.fe_filters.fieldsNotAvailable.indexOf($scope.fieldName);
            if (index != -1) $scope.dataset.fe_filters.fieldsNotAvailable.splice(index, 1);
            if ($scope.data.filterNotAvailable) {
                if ($scope.dataset.dirty !== 1 ) {
                    $scope.dataset.dirty = 3; //redo filter caching
                }
                $scope.dataset.fe_filters.fieldsNotAvailable.push($scope.fieldName);
            }

            index = $scope.dataset.fe_filters.fieldsCommaSeparatedAsIndividual.indexOf($scope.fieldName);
            if (index != -1) $scope.dataset.fe_filters.fieldsCommaSeparatedAsIndividual.splice(index, 1);
            if ($scope.data.commaSeparatedAsIndividual) {
                $scope.dataset.fe_filters.fieldsCommaSeparatedAsIndividual.push($scope.fieldName);
            }

            index = $scope.dataset.fe_filters.fieldsMultiSelectable.indexOf($scope.fieldName);
            if (index != -1) $scope.dataset.fe_filters.fieldsMultiSelectable.splice(index, 1);
            if ($scope.data.multipleSelection) {
                $scope.dataset.fe_filters.fieldsMultiSelectable.push($scope.fieldName);
            }

            index = $scope.dataset.fe_filters.fieldsSortableByInteger.indexOf($scope.fieldName);
            if (index != -1) $scope.dataset.fe_filters.fieldsSortableByInteger.splice(index, 1);
            if ($scope.data.sortableByInt) {
                $scope.dataset.fe_filters.fieldsSortableByInteger.push($scope.fieldName);
            }

            index = $scope.dataset.fe_filters.fieldsSortableInReverseOrder.indexOf($scope.fieldName);
            if (index != -1) $scope.dataset.fe_filters.fieldsSortableInReverseOrder.splice(index, 1);
            if ($scope.data.sortableInReverse) {
                $scope.dataset.fe_filters.fieldsSortableInReverseOrder.push($scope.fieldName);
            }

            if ($scope.dataset.fe_filters.oneToOneOverrideWithValuesByTitleByFieldName[$scope.fieldName]) {
                $scope.dataset.fe_filters.oneToOneOverrideWithValuesByTitleByFieldName[$scope.fieldName] =
                    $scope.dataset.fe_filters.oneToOneOverrideWithValuesByTitleByFieldName[$scope.fieldName].filter(function (elem) {
                        return elem.value != '' || elem.override != '';
                    });
                if ($scope.dataset.fe_filters.oneToOneOverrideWithValuesByTitleByFieldName[$scope.fieldName].length == 0)
                    delete $scope.dataset.fe_filters.oneToOneOverrideWithValuesByTitleByFieldName[$scope.fieldName];
            }

            $scope.dataset.fe_filters.keywords = $scope.dataset.fe_filters.keywords.filter(function (elem) {
                return elem.title != $scope.fieldName;
            });
            if ($scope.data.keywords.choices.length > 0) $scope.dataset.fe_filters.keywords = $scope.dataset.fe_filters.keywords.concat($scope.data.keywords);

            if ($scope.customFieldIndex != undefined) {
                if ($scope.dataset.dirty !== 1) {
                    $scope.dataset.dirty = 2;
                }
                $scope.dataset.customFieldsToProcess.splice(customFieldIndex, 1, $scope.customField);
            }

            $mdDialog.hide($scope.dataset);
        };

}])


