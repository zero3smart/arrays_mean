angular.module('arraysApp')
    .controller('DatasetDataCtrl', ['$scope', '$state', '$q', 'DatasetService', 'AuthService', '$mdToast', '$mdDialog', '$filter', 'dataset', 'additionalDatasources', 'availableTypeCoercions', 'availableDesignatedFields',
        function ($scope, $state, $q, DatasetService, AuthService, $mdToast, $mdDialog, $filter, dataset, additionalDatasources, availableTypeCoercions, availableDesignatedFields) {
            $scope.$parent.$parent.currentNavItem = 'data';



            $scope.availableTypeCoercions = availableTypeCoercions;


            // Assert some of the fields should be available
            if (!dataset.raw_rowObjects_coercionScheme) dataset.raw_rowObjects_coercionScheme = {};

            // include all fields (false) if new dataset
            if (!dataset.fe_excludeFields) {
                dataset.fe_excludeFields = {};
                for (var i = 0; i < dataset.columns.length; i++) {
                    dataset.fe_excludeFields[dataset.columns[i].name] = false;
                }
                $scope.excludeAll = true; // set toggle to "Exclude All"
            } else {
                $scope.excludeAll = false; // check if any fields are included, if not, set button to "Include All"
                for (var i = 0; i < dataset.columns.length; i++) {
                    if(!dataset.fe_excludeFields[dataset.columns[i].name]){
                        $scope.excludeAll = true; // at least one included, set toggle to "Exclude All"
                        break;
                    }
                }
            }

            $scope.primaryAction.text = 'Next';
            $scope.$watch('vm.dataForm.$valid', function(validity) {
                if (validity !== undefined) {

                    $scope.formValidity = validity;
                    if (dataset.connection) {

                        $scope.primaryAction.disabled = false;
                    } else {
                         $scope.primaryAction.disabled = !validity;
                    }

                }
            });
            $scope.primaryAction.do = function() {
                $scope.submitForm($scope.formValidity);
            };

            if (!dataset.fe_displayTitleOverrides) dataset.fe_displayTitleOverrides = {};
            if (!dataset.fe_designatedFields) dataset.fe_designatedFields = {};

            $scope.$parent.$parent.dataset = angular.copy(dataset);
            $scope.$parent.$parent.additionalDatasources = angular.copy(additionalDatasources);

            $scope.data = {};

            $scope.availableTypeCoercions = availableTypeCoercions;

            $scope.setDirty = function(number) {
                if ($scope.$parent.$parent.dataset.dirty == 0 && number > 0) {
                    $scope.$parent.$parent.dataset.dirty = number;
                }
            };

            $scope.toggleExclude = function (exclude) {
                for (var i = 0; i < $scope.data.fields.length; i++) {
                    $scope.dataset.fe_excludeFields[$scope.data.fields[i].name] = exclude;
                }
                $scope.excludeAll = exclude ? false : true; // toggle
            };

            $scope.openJoinTablesDialog = function(evt) {
                $mdDialog.show({
                    locals: {
                        dataset: $scope.$parent.$parent.dataset,
                        DatasetService: DatasetService,


                    },
                    controller: function($scope,$mdDialog,dataset,DatasetService) {
                        $scope.dataset = dataset;
                        $scope.colsByJoinTableName = {};

                        $scope.loadCols = function() {

                            if (!$scope.dataset.connection.join.tableName || $scope.dataset.connection.join.tableName == "") return;
                            if (!$scope.colsByJoinTableName[$scope.dataset.connection.join.tableName]) {
                                $scope.colsByJoinTableName[$scope.dataset.connection.join.tableName] = [];
                            }

                            DatasetService.colsForJoinTables($scope.dataset.connection)
                            .then(function(response) {
                                if (response.status == 200 && response.data) {
                                    $scope.colsByJoinTableName[$scope.dataset.connection.join.tableName] = response.data;
                                }
                            })

                            
                        }

                        $scope.remove = function() {
                            $scope.dialog.form.$setDirty();
                            delete $scope.dataset.connection.join;

                        }

                        $scope.save = function() {
                            $mdDialog.hide($scope.dataset);
                        }
                    },
                    parent: angular.element(document.body),
                    templateUrl: 'templates/blocks/data.joinTables.html',
                    clickOutsideToClose: true
                })
                .then(function(savedDataset) {
                     $scope.$parent.$parent.dataset = savedDataset;
                })

            }

            $scope.openFieldDialog = function (evt, fieldName, firstRecord, custom, customFieldIndex, filterOnly, columnIndex) {
                // using the same controller for general field settings and field filter setting, for now
                var fieldTemplate = filterOnly ? 'templates/blocks/data.field.filter.html' : 'templates/blocks/data.field.general.html';

                $mdDialog.show({
                    controller: FieldDialogController,
                    controllerAs: 'dialog',
                    templateUrl: fieldTemplate, //'templates/blocks/data.field.html',
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
                        custom: custom,
                        customFieldIndex: customFieldIndex,
                        filterOnly: filterOnly,
                        columnIndex: columnIndex
                    }
                })
                    .then(function (savedDataset) {
                        $scope.$parent.$parent.dataset = savedDataset;

                        if (Object.keys(savedDataset.fe_designatedFields).length > 0) {

                            for (var key in savedDataset.fe_designatedFields) {
                                $scope.data.fe_designatedFields[key] = savedDataset.fe_designatedFields[key];
                            }
                        }

                        $scope.coercionScheme = angular.copy(savedDataset.raw_rowObjects_coercionScheme);
                        sortColumnsByDisplayOrder();

                        $scope.vm.dataForm.$setDirty();

                        if(filterOnly) {
                            $scope.openFabricatedFilterDialog();
                        }

                    }, function () {

                        if(filterOnly) {
                            $scope.openFabricatedFilterDialog();
                        }

                    });
            };

            function FieldDialogController($scope, $mdDialog, $filter, fieldName, firstRecord, dataset, availableTypeCoercions, availableDesignatedFields, custom, customFieldIndex, filterOnly, columnIndex) {

                $scope.firstRecord = firstRecord;
                $scope.availableTypeCoercions = availableTypeCoercions;
                $scope.availableDesignatedFields = availableDesignatedFields;
                $scope.custom = custom;
                $scope.customFieldIndex = customFieldIndex;
                $scope.columnIndex = columnIndex;

                var originalFieldName = fieldName;

                function refreshFieldByName(name) {
                    // General
                    if (!$scope.dataset.fe_designatedFields) $scope.dataset.fe_designatedFields = {};
                    for (var key in $scope.dataset.fe_designatedFields) {
                        if ($scope.dataset.fe_designatedFields[key] == name) {
                            $scope.data.designatedField = key;
                            break;
                        }
                    }

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


                $scope.changeCoercionSchemeByOperation = function (colName, colIndex) {
                    var coercion = $scope.coercionScheme[colName];

                    if ($filter('typeCoercionToString')(coercion) != 'Date') {
                        $scope.dataset.raw_rowObjects_coercionScheme[colName] = coercion;
                        $scope.dataset.dirty = 1;
                        $scope.dialog.fieldForm.$setDirty();
                    } else {
                        if (!$scope.dataset.raw_rowObjects_coercionScheme[colName]) {
                            $scope.dataset.raw_rowObjects_coercionScheme[colName] = coercion;
                            $scope.dataset.dirty = 1;
                            $scope.dialog.fieldForm.$setDirty();

                        } else {
                            $scope.dataset.raw_rowObjects_coercionScheme[colName].operation = coercion.operation;
                            $scope.dialog.fieldForm.$setPristine();
                        }
                    }
                    // slice off the word "To" 
                    $scope.dataset.columns[colIndex].data_type = coercion.operation.slice(2);
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

                    if (!filterOnly) {
                        var currentValue = $scope.dialog.fieldForm.fieldName.$modelValue;

                        if (originalFieldName !== currentValue) {

                            var originalExclude = $scope.dataset.fe_excludeFields[originalFieldName];
                            $scope.dataset.fe_excludeFields[currentValue] = originalExclude;
                            delete $scope.dataset.fe_excludeFields[originalFieldName];
                        }
                    }

                    if (typeof $scope.data.designatedField !== 'undefined') {
                        $scope.dataset.fe_designatedFields[$scope.data.designatedField] = $scope.fieldName;
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
                        dataset: $scope.$parent.$parent.dataset,
                        additionalDatasources: $scope.$parent.$parent.additionalDatasources
                    }
                })
                    .then(function (result) {




                        $scope.$parent.$parent.dataset = result.dataset;
                        $scope.$parent.$parent.additionalDatasources = result.additionalDatasources;

                        $scope.coercionScheme = angular.copy(result.dataset.raw_rowObjects_coercionScheme);
                        sortColumnsByDisplayOrder();

                        $scope.vm.dataForm.$setDirty();
                    }, function () {
                        // console.log('You cancelled the nested dialog.');
                    });
            };

            function NestedDialogController($scope, $mdDialog, $filter, dataset, additionalDatasources) {


                $scope.reset = function () {
                    $scope.dataset = angular.copy(dataset);
                    $scope.additionalDatasources = angular.copy(additionalDatasources);

                    // Master datasource
                    $scope.data = {};

                    if (!$scope.dataset.fe_nestedObject) $scope.dataset.fe_nestedObject = {};
                    if (!$scope.dataset.fe_nestedObject.criteria) {
                        $scope.dataset.fe_nestedObject.criteria = {
                            operatorName: 'equal',
                            value: ''
                        };
                    }

                    if (!$scope.dataset.fe_nestedObject.fields) $scope.dataset.fe_nestedObject.fields = [];
                    $scope.data.fields = $scope.dataset.fe_nestedObject.fields;

                    if (!$scope.dataset.fe_nestedObject.fieldOverrides) $scope.dataset.fe_nestedObject.fieldOverrides = {};
                    $scope.data.fieldOverrides = [];
                    // Convert Object into Array
                    Object.keys($scope.dataset.fe_nestedObject.fieldOverrides).map(function (colName) {
                        $scope.data.fieldOverrides.push({
                            field: colName,
                            override: $scope.dataset.fe_nestedObject.fieldOverrides[colName]
                        });
                    });

                    if (!$scope.dataset.fe_nestedObject.valueOverrides) $scope.dataset.fe_nestedObject.valueOverrides = {};
                    $scope.data.valueOverrides = [];

                    // Convert Object into Array
                    Object.keys($scope.dataset.fe_nestedObject.valueOverrides).map(function (colName) {
                        var orgValueOverrides = $scope.dataset.fe_nestedObject.valueOverrides[colName];
                        var valueOverrides = [];
                        Object.keys(orgValueOverrides).map(function (value) {
                            valueOverrides.push({value: value, override: orgValueOverrides[value]});
                        });
                        $scope.data.valueOverrides.push({field: colName, valueOverrides: valueOverrides});
                    });

                    // Additional Datasources
                    $scope.additionalData = [];
                    $scope.additionalDatasources.forEach(function(datasource, index) {
                        $scope.additionalData.push({});

                        if (!datasource.fe_nestedObject) $scope.dataset.fe_nestedObject = {};
                        if (!datasource.fe_nestedObject.criteria) {
                            datasource.fe_nestedObject.criteria = {
                                operatorName: 'equal',
                                value: ''
                            };
                        }

                        if (!datasource.fe_nestedObject.fields) datasource.fe_nestedObject.fields = [];
                        $scope.additionalData[index].fields = datasource.fe_nestedObject.fields;

                        if (!datasource.fe_nestedObject.fieldOverrides) datasource.fe_nestedObject.fieldOverrides = {};
                        $scope.additionalData[index].fieldOverrides = [];
                        // Convert Object into Array
                        Object.keys(datasource.fe_nestedObject.fieldOverrides).map(function (colName) {
                            $scope.additionalData[index].fieldOverrides.push({
                                field: colName,
                                override: datasource.fe_nestedObject.fieldOverrides[colName]
                            });
                        });

                        if (!datasource.fe_nestedObject.valueOverrides) datasource.fe_nestedObject.valueOverrides = {};
                        $scope.additionalData[index].valueOverrides = [];

                        // Convert Object into Array
                        Object.keys(datasource.fe_nestedObject.valueOverrides).map(function (colName) {
                            var orgValueOverrides = datasource.fe_nestedObject.valueOverrides[colName];
                            var valueOverrides = [];
                            Object.keys(orgValueOverrides).map(function (value) {
                                valueOverrides.push({value: value, override: orgValueOverrides[value]});
                            });
                            $scope.additionalData[index].valueOverrides.push({field: colName, valueOverrides: valueOverrides});
                        });
                    });

                    if ($scope.dialog.form) $scope.dialog.form.$setPristine();
                };

                $scope.reset();

                $scope.cancel = function () {
                    $mdDialog.cancel();
                };

                $scope.addValueOverride = function (additionalIndex) {
                    if (additionalIndex === undefined)
                        $scope.data.valueOverrides.push({field: '', valueOverrides: [{value: '', override: ''}]});
                    else
                        $scope.additionalData[additionalIndex].valueOverrides.push({field: '', valueOverrides: [{value: '', override: ''}]});
                    $scope.dialog.form.$setDirty();
                };

                $scope.removeValueOverride = function (override, additionalIndex) {
                    if (additionalIndex === undefined) {
                        var index = $scope.data.valueOverrides.indexOf(override);
                        if (index != -1) $scope.data.valueOverrides.splice(index, 1);
                    } else {
                        index = $scope.additionalData[additionalIndex].valueOverrides.indexOf(override);
                        if (index != -1) $scope.additionalData[additionalIndex].valueOverrides.splice(index, 1);
                    }
                    $scope.dialog.form.$setDirty();
                };

                $scope.addFieldOverride = function (additionalIndex) {
                    if (additionalIndex === undefined)
                        $scope.data.fieldOverrides.push({field: '', override: ''});
                    else
                        $scope.additionalData[additionalIndex].fieldOverrides.push({field: '', override: ''});
                    $scope.dialog.form.$setDirty();
                };

                $scope.removeFieldOverride = function (override, additionalIndex) {
                    if (additionalIndex === undefined) {
                        var index = $scope.data.fieldOverrides.indexOf(override);
                        if (index != -1) $scope.data.fieldOverrides.splice(index, 1);
                    } else {
                        index = $scope.additionalData[additionalIndex].fieldOverrides.indexOf(override);
                        if (index != -1) $scope.additionalData[additionalIndex].fieldOverrides.splice(index, 1);
                    }
                    $scope.dialog.form.$setDirty();
                };

                $scope.save = function () {
                    // Master Dataset

                    if ($scope.dataset.dirty !== 1) {
                        $scope.dataset.dirty = 2;
                    }


                    $scope.dataset.fe_nestedObject.fields.map(function(field) {

                        var fieldName = $scope.dataset.fe_nestedObject.prefix + field;

                        if ($scope.dataset.fe_excludeFields[fieldName]) {
                            delete $scope.dataset.fe_excludeFields[fieldName];
                        }
                    });





                    $scope.dataset.fe_nestedObject.fieldOverrides = {};
                    $scope.data.fieldOverrides.map(function (elem) {
                        $scope.dataset.fe_nestedObject.fieldOverrides[elem.field] = elem.override;
                    });

                    $scope.dataset.fe_nestedObject.valueOverrides = {};
                    $scope.dataset.fe_nestedObject.fields = $scope.data.fields;


                    $scope.data.valueOverrides.map(function (elem) {

                        var valueOverrides = {};
                        elem.valueOverrides.map(function (el) {
                            valueOverrides[el.value] = el.override;
                        });
                        $scope.dataset.fe_nestedObject.valueOverrides[elem.field] = valueOverrides;
                    });





                    // Additional Datasources
                    $scope.additionalDatasources.forEach(function(datasource, index) {

                        if (datasource.dirty !== 1) {
                            datasource.dirty = 2;
                        }
                        datasource.fe_nestedObject.fieldOverrides = {};
                        $scope.additionalData[index].fieldOverrides.map(function (elem) {
                            datasource.fe_nestedObject.fieldOverrides[elem.field] = elem.override;
                        });

                        datasource.fe_nestedObject.valueOverrides = {};
                        datasource.fe_nestedObject.fields = $scope.additionalData[index].fields;
                        $scope.additionalData[index].valueOverrides.map(function (elem) {
                            var valueOverrides = {};
                            elem.valueOverrides.map(function (el) {
                                valueOverrides[el.value] = el.override;
                            });
                            datasource.fe_nestedObject.valueOverrides[elem.field] = valueOverrides;
                        });
                    });

                    $mdDialog.hide({
                        dataset: $scope.dataset,
                        additionalDatasources: $scope.additionalDatasources
                    });
                };
            }

            $scope.openFabricatedFilterDialog = function (evt) {

                var dataset = $scope.$parent.$parent.dataset;

                var colsAvailable = dataset.columns.map(function(column) {
                    return column.name;
                }).concat(dataset.customFieldsToProcess.map(function(customField) {
                    return customField.fieldName;
                })).concat(dataset.fe_nestedObject.fields.map(function(fieldName) {
                    if (dataset.fe_nestedObject.prefix)
                        return dataset.fe_nestedObject.prefix + fieldName;
                    return fieldName;
                })).concat(dataset.relationshipFields.map(function(field) {
                    return field.field;

                }));

                dataset.imageScraping.map(function(sourceURL) {
                    colsAvailable = colsAvailable.concat(sourceURL.setFields.map(function(field) {
                        return field.newFieldName;
                    }));
                });

                $mdDialog.show({
                    controller: FabricatedFilterDialogController,
                    controllerAs: 'dialog',
                    templateUrl: 'templates/blocks/data.filters.html',
                    parent: angular.element(document.body),
                    targetEvent: evt,
                    clickOutsideToClose: true,
                    fullscreen: true, // Only for -xs, -sm breakpoints.
                    locals: {
                        dataset: dataset,
                        colsAvailable: colsAvailable,
                        fields: $scope.data.fields,
                        openFieldDialog: $scope.openFieldDialog
                    }
                })
                    .then(function (savedDataset) {
                        $scope.$parent.$parent.dataset = savedDataset;
                        $scope.vm.dataForm.$setDirty();
                    }, function () {
                        // console.log('You cancelled the fabricated filter dialog.');
                    });
            };

            function FabricatedFilterDialogController($scope, $mdDialog, $filter, dataset, colsAvailable, openFieldDialog, fields) {
                $scope.colsAvailable = colsAvailable;
                $scope.openFieldDialog = openFieldDialog;
                $scope.fields = fields;
                $scope.indexInFabricatedFilter = function (input) {
                    for (var i = 0; i < $scope.dataset.fe_filters.fabricated.length; i++) {
                        var currentFab = $scope.dataset.fe_filters.fabricated[i];
                        if (currentFab.title == input) {
                            return i;
                        }
                    }
                    return -1;
                };

                $scope.reset = function () {
                    $scope.dataset = angular.copy(dataset);
                    $scope.data = {};

                    $scope.dataset.fe_filters.fabricated.map(function (fabricated) {
                        fabricated.choices[0].match.field = fabricated.choices[0].match.field.replace('rowParams.', '');
                    });

                    $scope.data.defaultFilters = [];
                    for (var name in $scope.dataset.fe_filters.default) {
                        $scope.data.defaultFilters.push({name: name, value: $scope.dataset.fe_filters.default[name]});
                    }

                    if ($scope.dialog.form) $scope.dialog.form.$setPristine();
                };

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

                $scope.toggleFilter = function(col) {
                    var fieldsNA = $scope.dataset.fe_filters.fieldsNotAvailable,
                        ndex = fieldsNA.indexOf(col);
                    if (ndex == -1) {
                        fieldsNA.push(col);
                    } else {
                        fieldsNA.splice(ndex, 1);
                    }
                    $scope.dialog.form.$setDirty();
                    // also set dataset to dirty, needs processing
                    if ($scope.dataset.dirty !== 1) {
                        $scope.dataset.dirty = 3;
                    }
                };

                $scope.editFilter = function(evt, field) {
                    if ($scope.dialog.form.$dirty || $scope.dialog.form.$valid) {
                        $scope.save();
                    } else {
                        $scope.cancel();
                    }
                    $scope.openFieldDialog(evt, field.name, field.sample, field.custom, field.customFieldIndex, true);
                };

                $scope.addFabricated = function () {
                    var emptyFabricated = $scope.dataset.fe_filters.fabricated.find(function (elem) {
                        return elem.title == '' && elem.choices[0].match.field == 'rowParams.' + fieldName;
                    });
                    if (emptyFabricated) return;

                    $scope.dataset.fe_filters.fabricated.push({
                        title: '',
                        choices: [
                            {
                                title: '',
                                match: {
                                    field: '',
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

                $scope.verifyUniqueDefaultFilter = function (defaultFilter, index) {
                    var defaultFilterUnique = true;

                    $scope.data.defaultFilters.forEach(function (elem) {
                        if (defaultFilter == elem) return;

                        if (defaultFilter.name == elem.name && elem.value == defaultFilter.value)
                            defaultFilterUnique = false;

                    });
                    $scope.dialog.form['defaultValue_' + index].$setValidity('unique', defaultFilterUnique);
                };

                $scope.removeDefaultFilter = function (index) {
                    $scope.data.defaultFilters.splice(index, 1);
                    $scope.dialog.form.$setDirty();
                };

                $scope.addDefaultFilter = function () {
                    $scope.data.defaultFilters.push({name: '', value: ''});
                };

                $scope.save = function () {
                    var _newDefaultFilters = {};

                    $scope.dataset.fe_filters.fabricated.map(function (fabricated) {
                        fabricated.choices[0].match.field = 'rowParams.' + fabricated.choices[0].match.field;
                    });

                    // overwrite defaultFilters so removed filters are--removed
                    $scope.data.defaultFilters.forEach(function (filter) {
                        _newDefaultFilters[filter.name] = filter.value;
                    });

                    $scope.dataset.fe_filters.default = _newDefaultFilters;

                    $mdDialog.hide($scope.dataset);
                };
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
                        dataset: $scope.$parent.$parent.dataset
                    }
                })
                    .then(function (savedDataset) {
                        $scope.$parent.$parent.dataset = savedDataset;
                        $scope.data.fe_designatedFields = savedDataset.fe_designatedFields;
                        sortColumnsByDisplayOrder();
                        $scope.vm.dataForm.$setDirty();
                    }, function () {
                        // console.log('You cancelled the image scraping dialog.');
                    });
            };

            function ImageScrapingDialogController($scope, $mdDialog, $filter, dataset) {

            

              
               

                $scope.isSrcSet = function(isSrcSet,field) {

               
                    if (!isSrcSet) {
                        delete field.resize;
                    } else {
                        delete field.size;
                    }

        

                }



                $scope.reset = function () {
                    $scope.dataset = angular.copy(dataset);
                    $scope.data = {};

                    if (!$scope.dataset.imageScraping) { $scope.dataset.imageScraping = []; }

                    var index = 0;
                    for (var i = 0; i < $scope.dataset.imageScraping.length ; i++) {
                        $scope.dataset.imageScraping[i].setFields.map(function(field) {

                          
                            var fieldName = field.newFieldName;
                            delete $scope.dataset.fe_excludeFields[fieldName];
                        });
                    }

                    $scope.availableDesignatedFields = availableDesignatedFields;

                    if (!$scope.dataset.fe_designatedFields) $scope.dataset.fe_designatedFields = {};
                    $scope.data.designatedFields = {};
                    for (var key in $scope.dataset.fe_designatedFields) {
                        $scope.data.designatedFields[$scope.dataset.fe_designatedFields[key]] = key;
                    }

                    if ($scope.dialog.form) $scope.dialog.form.$setPristine();
                };

                $scope.reset();

                $scope.addImageToScrap = function () {
                    $scope.dataset.imageScraping.push({
                        htmlSourceAtURLInField: '',
                        setFields: [
                            {
                                newFieldName: '',
                                prependToImageURLs: '',
                                resize: 200
                            }
                        ]
                    });

                };

                if (!$scope.dataset.imageScraping.length) { $scope.addImageToScrap(); }

                $scope.removeImageToScrap = function (index) {
                    $scope.dataset.imageScraping.splice(index, 1);
                    $scope.dialog.form.$setDirty();
                };

                $scope.addField = function (setFields) {
                    setFields.push({
                        newFieldName: '',
                        prependToImageURLs: '',
                        resize: 200
                    });


                };

                $scope.removeField = function (setFields, index) {
                    setFields.splice(index, 1);
                    $scope.dialog.form.$setDirty();
                };


                $scope.verifyUniqueHtmlSource = function (imageScraping, index) {
                    var unique = true;
                    $scope.dataset.imageScraping.forEach(function (_imageScraping) {
                        if (_imageScraping == imageScraping) return;

                        if (imageScraping.htmlSourceAtURLInField == _imageScraping.htmlSourceAtURLInField)
                            unique = false;
                    });

                    $scope.dialog.form['imageScrapingField_' + index].$setValidity('unique', unique);

                    // if newFieldName is blank, auto assign name // for demo
                    // don't change if exists -- change in the format field modal
                    imageScraping.setFields.forEach(function (field, i) {
                        if(field.newFieldName === '') {
                            var sourceFieldName = imageScraping.htmlSourceAtURLInField;
                            field.newFieldName = sourceFieldName + '_scraped_' + i;
                        }
                    });
                };

                $scope.verifyValidNewFieldName = function (fieldName, index) {



                    var unique = true, valid = true;
                    $scope.dataset.imageScraping.forEach(function (_imageScraping) {
                        var i = 0;
                        _imageScraping.setFields.forEach(function (field) {
                            if (field.newFieldName == fieldName && i != index) unique = false;
                            i++;
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




                    for (var fieldName in $scope.data.designatedFields) {
                        $scope.dataset.fe_designatedFields[$scope.data.designatedFields[fieldName]] = fieldName;
                    }

                    if ($scope.dataset.skipImageScraping == false && $scope.dataset.dirty == 0) {
                        $scope.dataset.dirty = 4;
                    }


                    $mdDialog.hide($scope.dataset);
                };
            }

            $scope.openJoinDialog = function(evt) {
                $mdDialog.show({
                    controller: JoinDialogController,
                    controllerAs: 'dialog',
                    templateUrl: 'templates/blocks/data.join.html',
                    parent: angular.element(document.body),
                    targetEvent: evt,
                    clickOutsideToClose: true,
                    fullscreen: true, // Only for -xs, -sm breakpoints.
                    locals: {
                        dataset: $scope.$parent.$parent.dataset,
                        fields: $scope.data.fields
                    }
                })
                    .then(function (savedDataset) {

                        $scope.$parent.$parent.dataset = savedDataset;
                        sortColumnsByDisplayOrder();

                        $scope.vm.dataForm.$setDirty();
                    }, function () {
                        // console.log('You cancelled the dataset join dialog.');
                    });
            };

            function JoinDialogController($scope, $mdDialog, DatasetService, AuthService, dataset, fields) {
                $scope.data = {};
                $scope.data.columns = [];
                $scope.selectedColumns = [];
                $scope.dataset = angular.copy(dataset);


                $scope.columnsAvailable = $scope.dataset.columns.concat(dataset.customFieldsToProcess.map(function(customField) {
                    return {name: customField.fieldName};
                }));

                if (!$scope.dataset.relationshipFields) $scope.dataset.relationshipFields = [];

                DatasetService.getAvailableMatchFns()
                    .then(function(availableMatchFns) {
                        $scope.availableMatchFns = availableMatchFns;
                    })
                    .catch(function(error) {
                        // console.error(error);
                    });

                var user = AuthService.currentUser();
                if (user.role == 'superAdmin' || user.role == 'admin') {
                    DatasetService.getDatasetsWithQuery({_team: user.defaultLoginTeam._id})
                        .then(initializeDatasets)
                        .catch(function(error) {
                            // console.error(error);
                        });
                } else if (user.role == 'editor') {
                    DatasetService.getDatasetsWithQuery({_id: {$in: user._editors}, _team: user.defaultLoginTeam._id})
                        .then(initializeDatasets)
                        .catch(function(error) {
                            // console.error(error);
                        });
                } else {
                    $scope.datasets = [];
                    $scope.data.foreignDataset = [];
                }

                function initializeDatasets(datasets) {
                    if (!datasets) return;
                    $scope.datasets = datasets.filter(function(source) { return source._id != dataset._id; });
                    $scope.data.foreignDataset = $scope.dataset.relationshipFields.map(function(relationshipField) {
                        return $scope.datasets.find(function(source) {
                            return source._id == relationshipField.by.joinDataset;
                        });
                    });

                    $scope.dataset.relationshipFields.forEach(function(relationshipField, index) {

                        DatasetService.getMappingDatasourceCols(relationshipField.by.joinDataset)
                            .then(function(response) {
                                if (response.status == 200) {
                                    $scope.data.columns[index] = response.data.cols;

                                }
                            });
                    });
                }

                $scope.reset = function() {
                    $scope.dataset = angular.copy(dataset);
                    initializeDatasets();

                    if ($scope.dialog.form) $scope.dialog.form.$setPristine();
                };

                $scope.verifyValidFieldName = function(fieldName, index) {
                    var unique = true, valid = true;
                    var i = 0;
                    $scope.dataset.relationshipFields.forEach(function(relationshipField) {
                        if (fieldName == relationshipField.field && i != index) unique = false;
                        i ++;
                    });
                    if (unique) {
                        // fields.forEach(function (field) {
                        //     if (fieldName == field.name) {
                        //
                        //     }
                        // });
                    }

                    if ($filter('dotless')(fieldName) != fieldName) valid = false;

                    $scope.dialog.form['field_' + index].$setValidity('unique', unique);
                    $scope.dialog.form['field_' + index].$setValidity('valid', valid);
                };

                $scope.removeJoin = function(index) {

                    // console.log($scope.dataset.relationshipFields[index]);
                    var fieldName = $scope.dataset.relationshipFields[index].field;
                    if ($scope.dataset.fe_objectShow_customHTMLOverrideFnsByColumnNames) {
                        delete $scope.dataset.fe_objectShow_customHTMLOverrideFnsByColumnNames[fieldName];
                    }
                    $scope.dataset.relationshipFields.splice(index, 1);
                    $scope.dialog.form.$setDirty();
                };

                $scope.loadColumnsForDataset = function(index) {
                    var source = $scope.data.foreignDataset[index];

                    DatasetService.getMappingDatasourceCols(source._id)
                        .then(function(response) {
                            if (response.status == 200) {
                                $scope.data.columns[index] = response.data.cols;

                            }
                        });
                };

                $scope.addJoin = function() {
                    if ($scope.dataset.dirty !== 1) {
                        $scope.dataset.dirty = 2;
                    }
                    $scope.dataset.relationshipFields.push({
                        field: '',
                        singular: true,
                        relationship: false,
                        by: {
                            operation: 'Join'
                        }
                    });
                    $scope.dialog.form.$setDirty();
                };

                //begin checkbox logic for showFields
                $scope.toggle = function(item, fieldName) {
                    $scope.dialog.form.$setDirty();
                    if (!$scope.dataset.fe_objectShow_customHTMLOverrideFnsByColumnNames) {
                        $scope.dataset.fe_objectShow_customHTMLOverrideFnsByColumnNames = {};
                    }
                    if ($scope.dataset.fe_objectShow_customHTMLOverrideFnsByColumnNames[fieldName] == undefined) {
                        $scope.dataset.fe_objectShow_customHTMLOverrideFnsByColumnNames[fieldName] = {};
                    }

                    if ($scope.dataset.fe_objectShow_customHTMLOverrideFnsByColumnNames[fieldName].showField == undefined) {
                        $scope.dataset.fe_objectShow_customHTMLOverrideFnsByColumnNames[fieldName].showField = [];
                    }

                    var i = $scope.dataset.fe_objectShow_customHTMLOverrideFnsByColumnNames[fieldName].showField.indexOf(item);
                    if(i > -1) {
                        $scope.dataset.fe_objectShow_customHTMLOverrideFnsByColumnNames[fieldName].showField.splice(i, 1);
                    } else {
                        $scope.dataset.fe_objectShow_customHTMLOverrideFnsByColumnNames[fieldName].showField.push(item);
                    }
                };



                $scope.isChecked = function(fieldName,datasetColumns) {

                    if (datasetColumns == undefined || $scope.dataset.fe_objectShow_customHTMLOverrideFnsByColumnNames == undefined) {
                        return false;
                    }
                    if ($scope.dataset.fe_objectShow_customHTMLOverrideFnsByColumnNames[fieldName] == undefined) {
                        $scope.dataset.fe_objectShow_customHTMLOverrideFnsByColumnNames[fieldName] = {};
                    }

                    if ($scope.dataset.fe_objectShow_customHTMLOverrideFnsByColumnNames[fieldName].showField == undefined) {
                        $scope.dataset.fe_objectShow_customHTMLOverrideFnsByColumnNames[fieldName].showField = [];
                    }
                    if($scope.dataset.fe_objectShow_customHTMLOverrideFnsByColumnNames[fieldName].showField.length > 0) {

                        return $scope.dataset.fe_objectShow_customHTMLOverrideFnsByColumnNames[fieldName].showField.length == datasetColumns.length;
                    }
                };

                $scope.toggleAll = function(fieldName,datasetColumns) {
                    $scope.dialog.form.$setDirty();

                    if ($scope.dataset.fe_objectShow_customHTMLOverrideFnsByColumnNames == undefined) {
                        $scope.dataset.fe_objectShow_customHTMLOverrideFnsByColumnNames = {};
                    }
                    if ($scope.dataset.fe_objectShow_customHTMLOverrideFnsByColumnNames[fieldName] == undefined) {
                        $scope.dataset.fe_objectShow_customHTMLOverrideFnsByColumnNames[fieldName] = {};
                    }

                    if ($scope.dataset.fe_objectShow_customHTMLOverrideFnsByColumnNames[fieldName].showField == undefined) {
                        $scope.dataset.fe_objectShow_customHTMLOverrideFnsByColumnNames[fieldName].showField = [];
                    }

                    if ($scope.dataset.fe_objectShow_customHTMLOverrideFnsByColumnNames[fieldName].showField.length == datasetColumns.length) {
                        $scope.dataset.fe_objectShow_customHTMLOverrideFnsByColumnNames[fieldName].showField = [];
                    } else if ($scope.dataset.fe_objectShow_customHTMLOverrideFnsByColumnNames[fieldName].showField.length == 0 ||
                        $scope.dataset.fe_objectShow_customHTMLOverrideFnsByColumnNames[fieldName].showField.length > 0) {

                        $scope.dataset.fe_objectShow_customHTMLOverrideFnsByColumnNames[fieldName].showField = [];

                        for(var i =0; i < datasetColumns.length; i++) {
                            $scope.dataset.fe_objectShow_customHTMLOverrideFnsByColumnNames[fieldName].showField.push(datasetColumns[i].name);
                        }


                    }


                };
                $scope.deleteFeObjectShow = function(fieldName) {


                    if ($scope.dataset.fe_objectShow_customHTMLOverrideFnsByColumnNames &&
                        $scope.dataset.fe_objectShow_customHTMLOverrideFnsByColumnNames[fieldName]) {

                        delete $scope.dataset.fe_objectShow_customHTMLOverrideFnsByColumnNames[fieldName];
                    }

                };

                $scope.cancel = function () {
                    $mdDialog.cancel();
                };

                $scope.save = function () {

                    if ($scope.dataset.dirty !== 1) {
                        $scope.dataset.dirty = 2;
                    }



                    $scope.dataset._otherSources = [];

                    $scope.data.foreignDataset.forEach(function(source, index) {

                        if ($scope.dataset.relationshipFields[index] !== undefined) {
                            $scope.dataset.relationshipFields[index].by.joinDataset = source._id;
                            var field_name = $scope.dataset.relationshipFields[index].field;

                            if ($scope.dataset._otherSources.indexOf(source._id) == -1 )
                                $scope.dataset._otherSources.push(source._id);

                        }
                    });
                    $mdDialog.hide($scope.dataset);
                };
            }

            function sortColumnsByDisplayOrder() {

                $scope.data.fields = $scope.$parent.$parent.dataset.columns.concat(
                    $scope.$parent.$parent.dataset.customFieldsToProcess.map(function(customField, index) {


                        if (!$scope.$parent.$parent.dataset.fe_excludeFields[customField.fieldName]) {
                            $scope.$parent.$parent.dataset.fe_excludeFields[customField.fieldName] = false;
                        }

                        return {
                            name: customField.fieldName,
                            sample: null,
                            custom: true,
                            customField: customField,
                            customFieldIndex: index
                        };
                    })
                ).concat(
                    $scope.$parent.$parent.dataset.fe_nestedObject.fields.map(function(field, index) {

                        var fieldName = $scope.$parent.$parent.dataset.fe_nestedObject.prefix + field;

                        if (!$scope.$parent.$parent.dataset.fe_excludeFields[fieldName]) {
                            $scope.$parent.$parent.dataset.fe_excludeFields[fieldName] = false;
                        }

                        return {
                            name: $scope.$parent.$parent.dataset.fe_nestedObject.prefix + field,
                            sample: null,
                            custom: true
                        };

                    })
                ).concat(
                    $scope.$parent.$parent.dataset.imageScraping.reduce(function(imageScraping1, imageScraping2) {
                        var setFields1 = imageScraping1.setFields || [],
                            setFields2 = imageScraping2.setFields || [];


                        return setFields1.map(function(field) {


                            if (!$scope.$parent.$parent.dataset.fe_excludeFields[field.newFieldName]) {
                                $scope.$parent.$parent.dataset.fe_excludeFields[field.newFieldName] = false;
                            }


                            return {
                                name: field.newFieldName,
                                sample: null,
                                custom: true
                            };
                        }).concat(setFields2.map(function(field) {


                            if (!$scope.$parent.$parent.dataset.fe_excludeFields[field.newFieldName]) {
                                $scope.$parent.$parent.dataset.fe_excludeFields[field.newFieldName] = false;

                            }


                            return {
                                name: field.newFieldName,
                                sample: null,
                                custom: true
                            };


                        }));
                    }, [])
                ).concat(
                    $scope.$parent.$parent.dataset.relationshipFields.map(function(relationshipField) {

                        if (!$scope.$parent.$parent.dataset.fe_excludeFields[relationshipField.field]) {
                            $scope.$parent.$parent.dataset.fe_excludeFields[relationshipField.field] = false;
                        }

                        return {
                            name: relationshipField.field,
                            custom: true

                        };
                    })


                );

                $scope.data.fields.sort(function (column1, column2) {
                    if ($scope.$parent.$parent.dataset.fe_fieldDisplayOrder.indexOf(column1.name) == -1 &&
                        $scope.$parent.$parent.dataset.fe_fieldDisplayOrder.indexOf(column2.name) != -1)
                        return 1;
                    else if ($scope.$parent.$parent.dataset.fe_fieldDisplayOrder.indexOf(column2.name) == -1 &&
                        $scope.$parent.$parent.dataset.fe_fieldDisplayOrder.indexOf(column1.name) != -1)
                        return -1;
                    else
                        return $scope.$parent.$parent.dataset.fe_fieldDisplayOrder.indexOf(column1.name) -
                            $scope.$parent.$parent.dataset.fe_fieldDisplayOrder.indexOf(column2.name);
                });

            }

            $scope.fieldSortableOptions = {
                stop: function (e, ui) {
                    $scope.$parent.$parent.dataset.fe_fieldDisplayOrder =
                        $scope.data.fields.map(function (field) {
                            return field.name;
                        });

                    $scope.vm.dataForm.$setDirty();
                },

                disabled: $scope.$parent.$parent.dataset.connection

            };

            $scope.saveRequiredFields = function() {
                $scope.$parent.$parent.dataset.fn_new_rowPrimaryKeyFromRowObject = $scope.data.fn_new_rowPrimaryKeyFromRowObject;
                for(designatedField in $scope.data.fe_designatedFields) {
                        $scope.$parent.$parent.dataset.fe_designatedFields[designatedField] = $scope.data.fe_designatedFields[designatedField];
                }
            };

            $scope.reset = function () {
                $scope.$parent.$parent.dataset = angular.copy(dataset);

                if (!dataset.columns) return;

                $scope.data = {};
                $scope.coercionScheme = angular.copy(dataset.raw_rowObjects_coercionScheme);
                $scope.data.fe_designatedFields = dataset.fe_designatedFields;
                sortColumnsByDisplayOrder();

                if ($scope.vm) $scope.vm.dataForm.$setPristine();
            };

            // ----------------------------------------------------
            // I think this was left over from when we had the data types in the dropdown
            // ----------------------------------------------------


            // $scope.changeCoercionSchemeByOperation = function (colName) {
            //     var coercion = $scope.coercionScheme[colName];

            //     if ($filter('typeCoercionToString')(coercion) != 'Date') {
            //         $scope.$parent.$parent.dataset.raw_rowObjects_coercionScheme[colName] = coercion;
            //         $scope.$parent.$parent.dataset.dirty = 1;

            //     } else {
            //         if (!$scope.$parent.$parent.dataset.raw_rowObjects_coercionScheme[colName]) {
            //             $scope.$parent.$parent.dataset.raw_rowObjects_coercionScheme[colName] = coercion;

            //             $scope.$parent.$parent.dataset.dirty = 1;

            //         }

            //         else {
            //             $scope.$parent.$parent.dataset.raw_rowObjects_coercionScheme[colName].operation = coercion.operation;

            //         }

            //     }
            // };
            // ---------------------------------------------------------

            $scope.reset();

            $scope.data.fe_designatedFields = dataset.fe_designatedFields;

            $scope.submitForm = function (isValid) {
                //Save settings primary key and object title as set in the ui
                console.log("submitting form")
                $scope.saveRequiredFields();


                if (isValid) {

                    var errorHandler = function (error) {
                            $mdToast.show(
                            $mdToast.simple()
                                .textContent(error)
                                .position('top right')
                                .hideDelay(5000)
                        );
                        }, done = function() {
                            $mdToast.show(
                            $mdToast.simple()
                                .textContent('Dataset updated successfully!')
                                .position('top right')
                                .hideDelay(3000)
                        );

                            $state.transitionTo('dashboard.dataset.views', {id: dataset._id}, {
                                reload: true,
                                inherit: false,
                                notify: true
                            });
                        };

                    var queue = [];

                    var finalizedDataset = angular.copy($scope.$parent.$parent.dataset);
                    delete finalizedDataset.columns;

                    queue.push(DatasetService.save(finalizedDataset));

                    $scope.$parent.$parent.additionalDatasources.forEach(function(datasource) {
                        var finalizedDatasource = angular.copy(datasource);
                        delete finalizedDatasource.fn_new_rowPrimaryKeyFromRowObject;
                        delete finalizedDatasource.raw_rowObjects_coercionScheme;
                        delete finalizedDatasource._otherSources;
                        delete finalizedDatasource._team;
                        delete finalizedDatasource.title;
                        delete finalizedDatasource.importRevision;
                        delete finalizedDatasource.author;
                        delete finalizedDatasource.updatedBy;
                        delete finalizedDatasource.brandColor;
                        delete finalizedDatasource.customFieldsToProcess;
                        delete finalizedDatasource.urls;
                        delete finalizedDatasource.description;
                        delete finalizedDatasource.fe_designatedFields;
                        delete finalizedDatasource.fe_excludeFields;
                        delete finalizedDatasource.fe_displayTitleOverrides;
                        delete finalizedDatasource.fe_fieldDisplayOrder;
                        delete finalizedDatasource.imageScraping;
                        delete finalizedDatasource.isPublic;
                        delete finalizedDatasource.fe_views;
                        delete finalizedDatasource.fe_filters;
                        delete finalizedDatasource.fe_objectShow_customHTMLOverrideFnsByColumnNames;



                        queue.push(DatasetService.save(finalizedDatasource));
                    });


                    $q.all(queue)
                        .then(done)
                        .catch(errorHandler);
                }
            };

        }
    ]);
