angular.module('arraysApp')
    .controller('DatasetDataCtrl', ['$scope', '$state', 'DatasetService', '$mdToast', '$mdDialog', '$filter', 'dataset', 'availableTypeCoercions', 'availableDesignatedFields',
        function ($scope, $state, DatasetService, $mdToast, $mdDialog, $filter, dataset, availableTypeCoercions, availableDesignatedFields) {

            $scope.$parent.$parent.currentNavItem = 'Data';
            $scope.availableTypeCoercions = availableTypeCoercions;

            // Assert some of the fields should be available
            if (!dataset.raw_rowObjects_coercionScheme) dataset.raw_rowObjects_coercionScheme = {};
            if (!dataset.fe_excludeFields) dataset.fe_excludeFields = {};
            if (!dataset.fe_displayTitleOverrides) dataset.fe_displayTitleOverrides = {};

            $scope.openFieldDialog = function (evt, fieldName, firstRecord, customFieldIndex) {
                $mdDialog.show({
                    controller: FieldDialogController,
                    controllerAs: 'dialog',
                    templateUrl: 'templates/blocks/data.field.html',
                    parent: angular.element(document.body),
                    targetEvent: evt,
                    clickOutsideToClose: true,
                    fullscreen: true, // Only for -xs, -sm breakpoints.
                    locals: {
                        fieldName: fieldName,
                        firstRecord: firstRecord,
                        dataset: $scope.$parent.$parent.dataset,
                        availableTypeCoercions: availableTypeCoercions,
                        availableDesignatedFields: availableDesignatedFields,
                        customFieldIndex: customFieldIndex
                    }
                })
                    .then(function (savedDataset) {
                        $scope.$parent.$parent.dataset = savedDataset;
                        $scope.coercionScheme = angular.copy(savedDataset.raw_rowObjects_coercionScheme);
                        $scope.vm.dataForm.$setDirty();
                    }, function () {
                        console.log('You cancelled the field dialog.');
                    });
            };

            function FieldDialogController($scope, $mdDialog, $filter, fieldName, firstRecord, dataset, availableTypeCoercions, availableDesignatedFields, customFieldIndex) {

                $scope.firstRecord = firstRecord;
                $scope.availableTypeCoercions = availableTypeCoercions;
                $scope.availableDesignatedFields = availableDesignatedFields;
                $scope.isCustom = customFieldIndex != undefined;


                $scope.colsAvailable = angular.copy(dataset.colNames).sort();



                function getColumnNameFromDotless(dotlessColumnName) {
                    return $scope.dataset.colNames.find(function (colName) {
                        return dotlessColumnName == $filter('dotless')(colName);
                    });
                }



                $scope.reset = function () {
                    $scope.dataset = angular.copy(dataset);
                    $scope.fieldName = fieldName;
                    $scope.finalizedFieldName = $filter('dotless')(fieldName);

                    if ($scope.isCustom) {
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
                    }

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
                    if (!$scope.dataset.fe_filters.valuesToExcludeByOriginalKey[$scope.finalizedFieldName])
                        $scope.dataset.fe_filters.valuesToExcludeByOriginalKey[$scope.finalizedFieldName] = [];
                    if (!$scope.dataset.fe_filters.valuesToExcludeByOriginalKey._all)
                        $scope.dataset.fe_filters.valuesToExcludeByOriginalKey._all = [];

                    if (!$scope.dataset.fe_filters.keywords) $scope.dataset.fe_filters.keywords = [];
                    $scope.data.keywords = $scope.dataset.fe_filters.keywords.find(function (elem) {
                        return elem.title == $scope.finalizedFieldName;
                    });
                    if (!$scope.data.keywords) $scope.data.keywords = {title: $scope.finalizedFieldName, choices: []};

                    // Custom Fields
                    if ($scope.isCustom) {
                        $scope.data.fields = $scope.customField.fieldsToMergeIntoArray.map(getColumnNameFromDotless);
                    }

                    // Data Type Coercion
                    $scope.coercionScheme = angular.copy(dataset.raw_rowObjects_coercionScheme);

                    if ($scope.dialog.fieldForm) $scope.dialog.fieldForm.$setPristine();
                };

                $scope.reset();

                $scope.removeOneToOneOverride = function (valueByOverride) {
                    var index = $scope.dataset.fe_filters.oneToOneOverrideWithValuesByTitleByFieldName[$scope.finalizedFieldName].indexOf(valueByOverride);
                    if (index != -1) {
                        $scope.dataset.fe_filters.oneToOneOverrideWithValuesByTitleByFieldName[$scope.finalizedFieldName].splice(index, 1);
                        $scope.dialog.fieldForm.$setDirty();
                    }
                };

                $scope.addOneToOneOverride = function () {
                    if (!$scope.dataset.fe_filters.oneToOneOverrideWithValuesByTitleByFieldName[$scope.finalizedFieldName])
                        $scope.dataset.fe_filters.oneToOneOverrideWithValuesByTitleByFieldName[$scope.finalizedFieldName] = [];
                    var emptyElem = $scope.dataset.fe_filters.oneToOneOverrideWithValuesByTitleByFieldName[$scope.finalizedFieldName].find(function (elem) {
                        return elem.value == '';
                    });
                    if (!emptyElem) {
                        $scope.dataset.fe_filters.oneToOneOverrideWithValuesByTitleByFieldName[$scope.finalizedFieldName].push({
                            override: '',
                            value: ''
                        });
                        $scope.dialog.fieldForm.$setDirty();
                    }
                };

                $scope.verifyUniqueValueOverride = function (valueOverride, index) {
                    var valueOverrideUnique = true, valueOverrideTitleUnique = true;
                    $scope.dataset.fe_filters.oneToOneOverrideWithValuesByTitleByFieldName[$scope.finalizedFieldName].forEach(function (elem) {
                        if (valueOverride == elem) return;

                        if (valueOverride.value == elem.value) valueOverrideUnique = false;
                        if (valueOverride.override == elem.override) valueOverrideTitleUnique = false;
                    });

                    $scope.dialog.fieldForm['overrideValue_' + index].$setValidity('unique', valueOverrideUnique);
                    $scope.dialog.fieldForm['overrideValueTitle_' + index].$setValidity('unique', valueOverrideTitleUnique);
                };

                $scope.changeCoercionSchemeByOperation = function(coercion, finalizedColName) {
                    if ($filter('typeCoercionToString')(coercion) != 'Date') {
                        $scope.dataset.raw_rowObjects_coercionScheme[finalizedColName] = coercion;
                    } else {
                        if (!$scope.dataset.raw_rowObjects_coercionScheme[finalizedColName]) {
                            $scope.dataset.raw_rowObjects_coercionScheme[finalizedColName] = coercion;
                        } else {
                            $scope.dataset.raw_rowObjects_coercionScheme[finalizedColName].operation = coercion.operation;
                        }
                    }
                };

                $scope.cancel = function () {
                    $mdDialog.cancel();
                };

                $scope.delete = function() {
                    $scope.reset();
                    if (customFieldIndex < $scope.dataset.customFieldsToProcess.length) {
                        $scope.dataset.customFieldsToProcess.splice(customFieldIndex, 1);
                    }

                    $mdDialog.hide($scope.dataset);
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

                    if ($scope.isCustom) {
                        $scope.customField.fieldsToMergeIntoArray = $scope.data.fields.map($filter('dotless'));
                        $scope.dataset.customFieldsToProcess.splice(customFieldIndex, 1, $scope.customField);
                    }

                    $mdDialog.hide($scope.dataset);
                };
            }

            $scope.openNestedDialog = function (evt) {
                $mdDialog.show({
                    controller: NestedDialogController,
                    controllerAs: 'dialog',
                    templateUrl: 'templates/blocks/data.nested.html',
                    parent: angular.element(document.body),
                    targetEvent: evt,
                    clickOutsideToClose: true,
                    fullscreen: true, // Only for -xs, -sm breakpoints.
                    locals: {
                        dataset: $scope.$parent.$parent.dataset
                    }
                })
                    .then(function (savedDataset) {
                        $scope.$parent.$parent.dataset = savedDataset;
                        $scope.vm.dataForm.$setDirty();
                    }, function () {
                        console.log('You cancelled the nested dialog.');
                    });
            };

            function NestedDialogController($scope, $mdDialog, $filter, dataset) {

                function getColumnNameFromDotless(dotlessColumnName) {
                    return $scope.dataset.colNames.find(function (colName) {
                        return dotlessColumnName == $filter('dotless')(colName);
                    });
                }

                $scope.reset = function () {
                    $scope.dataset = angular.copy(dataset);

                    $scope.data = {};

                    if (!$scope.dataset.fe_nestedObject) $scope.dataset.fe_nestedObject = {};
                    if (!$scope.dataset.fe_nestedObject.criteria) {
                        $scope.dataset.fe_nestedObject.criteria = {
                            operatorName: 'equal',
                            value: ''
                        };
                    }
                    $scope.data.criteria = $scope.dataset.colNames.find(function (colName) {
                        return $filter('dotless')(colName) == $scope.dataset.fe_nestedObject.criteria.fieldName;
                    });

                    if (!$scope.dataset.fe_nestedObject.fields) $scope.dataset.fe_nestedObject.fields = [];
                    $scope.data.fields = $scope.dataset.fe_nestedObject.fields.map(getColumnNameFromDotless);

                    if (!$scope.dataset.fe_nestedObject.fieldOverrides) $scope.dataset.fe_nestedObject.fieldOverrides = {};
                    $scope.data.fieldOverrides = [];
                    // Convert Object into Array
                    Object.keys($scope.dataset.fe_nestedObject.fieldOverrides).map(function (dotlessColName) {
                        var realColumnName = getColumnNameFromDotless(dotlessColName);
                        $scope.data.fieldOverrides.push({
                            field: realColumnName,
                            override: $scope.dataset.fe_nestedObject.fieldOverrides[dotlessColName]
                        });
                    });

                    if (!$scope.dataset.fe_nestedObject.valueOverrides) $scope.dataset.fe_nestedObject.valueOverrides = {};
                    $scope.data.valueOverrides = [];
                    // Convert Object into Array
                    Object.keys($scope.dataset.fe_nestedObject.valueOverrides).map(function (dotlessColName) {
                        var realColumnName = getColumnNameFromDotless(dotlessColName);
                        var orgValueOverrides = $scope.dataset.fe_nestedObject.valueOverrides[dotlessColName];
                        var valueOverrides = [];
                        Object.keys(orgValueOverrides).map(function (value) {
                            valueOverrides.push({value: value, override: orgValueOverrides[value]})
                        });
                        $scope.data.valueOverrides.push({field: realColumnName, valueOverrides: valueOverrides});
                    });

                    if ($scope.dialog.form) $scope.dialog.form.$setPristine();
                };

                $scope.reset();

                $scope.cancel = function () {
                    $mdDialog.cancel();
                };

                $scope.addValueOverride = function () {
                    $scope.data.valueOverrides.push({field: '', valueOverrides: [{value: '', override: ''}]});
                    $scope.dialog.form.$setDirty();
                };

                $scope.removeValueOverride = function (override) {
                    var index = $scope.data.valueOverrides.indexOf(override);
                    if (index != -1) $scope.data.valueOverrides.splice(index, 1);
                    $scope.dialog.form.$setDirty();
                };

                $scope.addFieldOverride = function () {
                    $scope.data.fieldOverrides.push({field: '', override: ''});
                    $scope.dialog.form.$setDirty();
                };

                $scope.removeFieldOverride = function (override) {
                    var index = $scope.data.fieldOverrides.indexOf(override);
                    if (index != -1) $scope.data.fieldOverrides.splice(index, 1);
                    $scope.dialog.form.$setDirty();
                };

                $scope.save = function () {
                    $scope.dataset.fe_nestedObject.criteria.fieldName = $filter('dotless')($scope.data.criteria);

                    $scope.dataset.fe_nestedObject.fields = $scope.data.fields.map($filter('dotless'));

                    $scope.dataset.fe_nestedObject.fieldOverrides = {};
                    $scope.data.fieldOverrides.map(function (elem) {
                        $scope.dataset.fe_nestedObject.fieldOverrides[$filter('dotless')(elem.field)] = elem.override;
                    });

                    $scope.dataset.fe_nestedObject.valueOverrides = {};
                    $scope.data.valueOverrides.map(function (elem) {
                        var valueOverrides = {};
                        elem.valueOverrides.map(function (el) {
                            valueOverrides[el.value] = el.override;
                        });
                        $scope.dataset.fe_nestedObject.valueOverrides[$filter('dotless')(elem.field)] = valueOverrides;
                    });

                    $mdDialog.hide($scope.dataset);
                }
            }

            $scope.openFabricatedFilterDialog = function(evt) {

          

                $mdDialog.show({
                    controller: FabricatedFilterDialogController,
                    controllerAs: 'dialog',
                    templateUrl: 'templates/blocks/data.fabricated.html',
                    parent: angular.element(document.body),
                    targetEvent: evt,
                    clickOutsideToClose: true,
                    fullscreen: true, // Only for -xs, -sm breakpoints.
                    locals: {
                        dataset: $scope.$parent.$parent.dataset,
                    }
                })
                    .then(function (savedDataset) {
                        $scope.$parent.$parent.dataset = savedDataset;
                        $scope.vm.dataForm.$setDirty();
                    }, function () {
                        console.log('You cancelled the fabricated filter dialog.');
                    });
            };

            function FabricatedFilterDialogController($scope, $mdDialog, $filter, dataset) {
                function getColumnNameFromDotless(dotlessColumnName) {
                    return $scope.dataset.colNames.find(function (colName) {
                        return dotlessColumnName == $filter('dotless')(colName);
                    });
                }

                $scope.colsAvailable = angular.copy(dataset.colNames).sort();

                $scope.reset = function () {
                    $scope.dataset = angular.copy(dataset);
                    $scope.data = {};

                    $scope.dataset.fe_filters.fabricated.map(function(fabricated) {
                        fabricated.choices[0].match.field = getColumnNameFromDotless(fabricated.choices[0].match.field.replace('rowParams.', ''));
                    });

                    $scope.data.defaultFilters = [];
                    for (var name in $scope.dataset.fe_filters.default) {
                        var realName = getColumnNameFromDotless(name);
                        if (!realName) realName = name;
                        $scope.data.defaultFilters.push({name: realName, value: $scope.dataset.fe_filters.default[name]});
                    }

                    if ($scope.dialog.form) $scope.dialog.form.$setPristine();
                }

                $scope.reset();

                $scope.verifyUniqueFabricated = function (fabricated, index) {
                    var fabricatedTitleUnique = true, fabricatedValueUnique = true;

                    $scope.dataset.fe_filters.fabricated.forEach(function (elem) {
                        if (fabricated == elem) return;

                        if (fabricated.title == elem.title)
                            fabricatedTitleUnique = false;
                        if (fabricated.choices[0].title == elem.choices[0].title)
                            fabricatedValueUnique = false;

                    });
                    $scope.dialog.form['fabricatedTitle_' + index].$setValidity('unique', fabricatedTitleUnique);
                    $scope.dialog.form['fabricatedValue_' + index].$setValidity('unique', fabricatedValueUnique);
                };

                $scope.addFabricated = function () {
                    var emptyFabricated = $scope.dataset.fe_filters.fabricated.find(function (elem) {
                        return elem.title == '' && elem.choices[0].match.field == 'rowParams.' + $scope.finalizedFieldName;
                    });
                    if (emptyFabricated) return;

                    $scope.dataset.fe_filters.fabricated.push({
                        title: "",
                        choices: [
                            {
                                title: "",
                                match: {
                                    field: "",
                                    exist: true,
                                    nin: []
                                }
                            }
                        ]
                    });
                    $scope.dialog.form.$setDirty();
                };

                $scope.removeFabricated = function (fabricated) {
                    var index = $scope.dataset.fe_filters.fabricated.indexOf(fabricated);
                    if (index != -1) {
                        $scope.dataset.fe_filters.fabricated.splice(index, 1);
                        $scope.dialog.form.$setDirty();
                    }
                };

                $scope.cancel = function () {
                    $mdDialog.cancel();
                };

                $scope.verifyUniqueDefaultFilter = function(defaultFilter, index) {
                    var defaultFilterUnique = true;

                    $scope.data.defaultFilters.forEach(function (elem) {
                        if (defaultFilter == elem) return;

                        if (defaultFilter.name == elem.name && elem.value == defaultFilter.value)
                            defaultFilterUnique = false;

                    });
                    $scope.dialog.form['defaultValue_' + index].$setValidity('unique', defaultFilterUnique);
                };

                $scope.removeDefaultFilter = function(index) {
                    $scope.data.defaultFilters.splice(index, 1);
                    $scope.dialog.form.$setDirty();
                };

                $scope.addDefaultFilter = function() {
                    $scope.data.defaultFilters.push({name: '', value: ''});
                };

                $scope.save = function () {
                    $scope.dataset.fe_filters.fabricated.map(function(fabricated) {
                        fabricated.choices[0].match.field = 'rowParams.' + $filter('dotless')(fabricated.choices[0].match.field);
                    });

                    $scope.data.defaultFilters.forEach(function(filter) {
                        if (!$scope.dataset.fe_filters.default) $scope.dataset.fe_filters.default = {};
                        $scope.dataset.fe_filters.default[$filter('dotless')(filter.name)] = filter.value;
                    });

                    $mdDialog.hide($scope.dataset);
                }
            }

            $scope.openImageScrapingDialog = function (evt) {
                $mdDialog.show({
                    controller: ImageScrapingDialogController,
                    controllerAs: 'dialog',
                    templateUrl: 'templates/blocks/data.imagescraping.html',
                    parent: angular.element(document.body),
                    targetEvent: evt,
                    clickOutsideToClose: true,
                    fullscreen: true, // Only for -xs, -sm breakpoints.
                    locals: {
                        dataset: $scope.$parent.$parent.dataset,
                        availableDesignatedFields: availableDesignatedFields,
                    }
                })
                    .then(function (savedDataset) {
                        $scope.$parent.$parent.dataset = savedDataset;
                        $scope.vm.dataForm.$setDirty();
                    }, function () {
                        console.log('You cancelled the image scraping dialog.');
                    });
            };

            function ImageScrapingDialogController($scope, $mdDialog, $filter, dataset, availableDesignatedFields) {

                function getColumnNameFromDotless(dotlessColumnName) {
                    return $scope.dataset.colNames.find(function (colName) {
                        return dotlessColumnName == $filter('dotless')(colName);
                    });
                }

                $scope.reset = function () {
                    $scope.dataset = angular.copy(dataset);
                    $scope.data = {};

                    if (!$scope.dataset.imageScraping) $scope.dataset.imageScraping = [];
                    $scope.dataset.imageScraping.forEach(function(imageScraping) {
                        imageScraping.htmlSourceAtURLInField = getColumnNameFromDotless(imageScraping.htmlSourceAtURLInField);
                    });

                    $scope.availableDesignatedFields = availableDesignatedFields;

                    if (!$scope.dataset.fe_designatedFields) $scope.dataset.fe_designatedFields = {};
                    $scope.data.designatedFields = {};
                    for (var key in $scope.dataset.fe_designatedFields) {
                        $scope.data.designatedFields[$scope.dataset.fe_designatedFields[key]] = key;
                    }

                    if ($scope.dialog.form) $scope.dialog.form.$setPristine();
                };

                $scope.reset();

                $scope.addImageToScrap = function() {
                    $scope.dataset.imageScraping.push({
                        htmlSourceAtURLInField: '',
                        setFields: [
                            {
                                newFieldName: '',
                                prependToImageURLs: '',
                                resize: 600
                            }
                        ]
                    });
                };

                $scope.removeImageToScrap = function(index) {
                    $scope.dataset.imageScraping.splice(index, 1);
                    $scope.dialog.form.$setDirty();
                };

                $scope.addField = function(setFields) {
                    setFields.push({
                        newFieldName: '',
                        prependToImageURLs: '',
                        resize: 600
                    });
                };

                $scope.removeField = function(setFields, index) {
                    setFields.splice(index, 1);
                    $scope.dialog.form.$setDirty();
                };

                $scope.verifyUniqueHtmlSource = function(imageScraping, index) {
                    var unique = true;
                    $scope.dataset.imageScraping.forEach(function(_imageScraping) {
                        if (_imageScraping == imageScraping) return;

                        if (imageScraping.htmlSourceAtURLInField == _imageScraping.htmlSourceAtURLInField)
                            unique = false;
                    });

                    $scope.dialog.form['imageScrapingField_' + index].$setValidity('unique', unique);
                };

                $scope.verifyValidNewFieldName = function(fieldName, index) {
                    var unique = true, valid = true;
                    $scope.dataset.imageScraping.forEach(function(_imageScraping) {
                        var i = 0;
                        _imageScraping.setFields.forEach(function(field) {
                            if (field.newFieldName == fieldName && i != index) unique = false;
                            i ++;
                        });
                    });

                    if ($filter('dotless')(fieldName) != fieldName) valid = false;

                    $scope.dialog.form['newField_' + index].$setValidity('unique', unique);
                    $scope.dialog.form['newField_' + index].$setValidity('valid', valid);
                };

                $scope.cancel = function () {
                    $mdDialog.cancel();
                };

                $scope.save = function () {
                    $scope.dataset.imageScraping.forEach(function(imageScraping) {
                        imageScraping.htmlSourceAtURLInField = $filter('dotless')(imageScraping.htmlSourceAtURLInField);
                    });

                    for (var fieldName in $scope.data.designatedFields) {
                        $scope.dataset.fe_designatedFields[$scope.data.designatedFields[fieldName]] = fieldName;
                    }

                    $mdDialog.hide($scope.dataset);
                };
            }

            $scope.reset = function () {
                $scope.$parent.$parent.dataset = angular.copy(dataset);

                if (!dataset.colNames) return;

                $scope.data = {};
                $scope.data.primaryKey = dataset.colNames.find(function (colName) {
                    return $filter('dotless')(colName) == dataset.fn_new_rowPrimaryKeyFromRowObject;
                });

                $scope.coercionScheme = angular.copy(dataset.raw_rowObjects_coercionScheme);

                $scope.sortableOptions = {
                    handle: '> .glyphicon',
                    stop: function(e, ui) {
                        console.log($scope.$parent.$parent.dataset.colNames);
                    }
                }

                if ($scope.vm) $scope.vm.dataForm.$setPristine();
            };

            $scope.changeCoercionSchemeByOperation = function(coercion, finalizedColName) {
                if ($filter('typeCoercionToString')(coercion) != 'Date') {
                    $scope.$parent.$parent.dataset.raw_rowObjects_coercionScheme[finalizedColName] = coercion;
                } else {
                    if (!$scope.$parent.$parent.dataset.raw_rowObjects_coercionScheme[finalizedColName])
                        $scope.$parent.$parent.dataset.raw_rowObjects_coercionScheme[finalizedColName] = coercion;
                    else
                        $scope.$parent.$parent.dataset.raw_rowObjects_coercionScheme[finalizedColName].operation = coercion.operation;
                }
            };

            $scope.reset();

            $scope.submitForm = function (isValid) {
                if (isValid) {
                    var finalizedDataset = angular.copy($scope.$parent.$parent.dataset);
                    finalizedDataset.fn_new_rowPrimaryKeyFromRowObject = $filter('dotless')($scope.data.primaryKey);
                    delete finalizedDataset.firstRecord;
                    delete finalizedDataset.colNames;

                    DatasetService.save(finalizedDataset)
                        .then(function (id) {
                            $mdToast.show(
                                $mdToast.simple()
                                    .textContent('Dataset updated successfully!')
                                    .position('top right')
                                    .hideDelay(3000)
                            );

                            $state.transitionTo('dashboard.dataset.views', {id: id}, {
                                reload: true,
                                inherit: false,
                                notify: true
                            });
                        }, function (error) {
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