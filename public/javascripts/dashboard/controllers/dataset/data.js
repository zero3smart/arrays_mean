angular.module('arraysApp')
    .controller('DatasetDataCtrl', ['$scope', '$state', '$q', 'DatasetService', 'AuthService', '$mdToast', '$filter', 'dataset', 'additionalDatasources', 'availableTypeCoercions', 'modalService', '$window', 'viewUrlService',
        function ($scope, $state, $q, DatasetService, AuthService, $mdToast,  $filter, dataset, additionalDatasources, availableTypeCoercions, modalService, $window, viewUrlService) {
            $scope.$parent.$parent.currentNavItem = 'data';

            $scope.availableTypeCoercions = availableTypeCoercions;
            // Assert some of the fields should be available
            if (!dataset.raw_rowObjects_coercionScheme) dataset.raw_rowObjects_coercionScheme = {};

            // include all fields (false) if new dataset
            if (!dataset.fe_excludeFields) {
                dataset.fe_excludeFields = {};
                for (var i = 0; i < dataset.columns.length; i++) {
                    dataset.fe_excludeFields[dataset.columns[i].name.replace('.', '')] = false;
                }
                $scope.excludeAll = true; // set toggle to "Exclude All"
            } else {
                $scope.excludeAll = false; // check if any fields are included, if not, set button to "Include All"
                for (i = 0; i < dataset.columns.length; i++) {
                    if(!dataset.fe_excludeFields[dataset.columns[i].name]){
                        $scope.excludeAll = true; // at least one included, set toggle to "Exclude All"
                        break;
                    }
                }
            }
            console.log(dataset)

            dataset.firstImport = $scope.checkIfFirstImport(dataset.firstImport);

            // primary actions
            // NOTE dashboard.dataset.process also contains logic
            // to progress or not based on firstImport
            var _nextTab = function() {
                var nextState = ($scope.$parent.$parent.dataset.dirty ) ? 'dashboard.dataset.process' : 'dashboard.dataset.views';
                $state.transitionTo(nextState, {id: dataset._id}, {
                    reload: true,
                    inherit: false,
                    notify: true
                });
            };
            var _viewViz = function() {
                var url = viewUrlService.getViewUrl($scope.subdomain, dataset, dataset.fe_views.default_view, false);
                $window.open(url, '_blank');
            };

            $scope.secondaryAction.do = function() {
                $scope.reset();
            };

            $scope.$parent.$parent.discardChangesThisView = angular.noop;

            /** If object to exclude fields from object detail doesn't exist, make it. Include all (false) by default */
            if(!dataset.fe_excludeFieldsObjDetail) {
                dataset.fe_excludeFieldsObjDetail = {};
                for (i = 0; i < dataset.columns.length; i++) {
                    dataset.fe_excludeFieldsObjDetail[dataset.columns[i].name] = false;
                }
            }


            $scope.$watch('vm.dataForm.$valid', function(validity) {
                if (validity !== undefined) {

                    $scope.formValidity = validity;
                    // TODO check this connection logic
                    if (dataset.connection) {
                        $scope.primaryAction.disabled = false;
                    } else {
                        $scope.primaryAction.disabled = !validity;
                    }

                }
            });

            $scope.$watch('submitting', function(sub) {
                $scope.primaryAction.disabled = (sub == true);
            });


            $scope.$watch('vm.dataForm.$dirty', function(dirty) {
                $scope.setRemindUserUnsavedChanges(dirty);

                if (dirty) {
                    // $scope.primaryAction.disabled = false;
                    $scope.primaryAction.text = dataset.firstImport ? 'Next' : 'Save';
                    $scope.primaryAction.do = function() {
                        $scope.submitForm($scope.formValidity);
                    };
                } else {
                    // $scope.primaryAction.disabled = false;
                    $scope.primaryAction.text = dataset.firstImport ? 'Next' : 'View';
                    $scope.primaryAction.do = dataset.firstImport ? _nextTab : _viewViz;
                }

                $scope.secondaryAction.disabled = !dirty;
                if (dirty && dataset.imported) $scope.secondaryAction.text = 'Revert';
                else $scope.secondaryAction.text = null;
            });

            $scope.tutorial.message = 'Here you can set the title for each item and edit fields and filters.';

            if (!dataset.fe_displayTitleOverrides) dataset.fe_displayTitleOverrides = {};
            if (!dataset.fe_visible) {dataset.fe_visible = true;}

            $scope.$parent.$parent.dataset = angular.copy(dataset);
            $scope.$parent.$parent.additionalDatasources = angular.copy(additionalDatasources);

            $scope.data = {};

            $scope.availableTypeCoercions = availableTypeCoercions;

            $scope.setDirty = function(number) {
                if ($scope.$parent.$parent.dataset.dirty == 0 && number > 0) {
                    $scope.$parent.$parent.dataset.dirty = number;
                }
            };


            var joinDataCols = [];


            if ($scope.$parent.$parent.dataset.connection &&
                $scope.$parent.$parent.dataset.connection.join &&
                $scope.$parent.$parent.dataset.connection.join.tableName) {

                DatasetService.colsForJoinTables($scope.$parent.$parent.dataset._id, $scope.$parent.$parent.dataset.connection)
                    .then(function(response) {

                        if (response.status == 200 && response.data) {
                            joinDataCols = response.data;
                            $scope.loadJoinCols();
                        }
                    });
            }


            $scope.loadJoinCols = function() {

                if ($scope.$parent.$parent.dataset.connection.join  && joinDataCols) {
                    $scope.data.fields = $scope.originalFields.concat(joinDataCols);
                } else {
                    $scope.data.fields = $scope.originalFields;
                }
            };

            $scope.updateFieldInclusion = function(fieldName) {
                $scope.setDirty(3);

                /** Match object detail exclusion to field exclusion  */
                $scope.dataset.fe_excludeFieldsObjDetail[fieldName] = $scope.dataset.fe_excludeFields[fieldName];
            };

            $scope.toggleExclude = function (exclude) {
                for (var i = 0; i < $scope.originalFields.length; i++) {
                    $scope.dataset.fe_excludeFields[$scope.originalFields[i].name] = exclude;
                }
                $scope.excludeAll = !exclude; // toggle
            };

            $scope.toggleObjectDetailDisplay = function(fieldName) {
                $scope.dataset.fe_excludeFieldsObjDetail[fieldName] = !$scope.dataset.fe_excludeFieldsObjDetail[fieldName];
            };

            $scope.openJoinTablesDialog = function() {
                var data = {
                    dataset: $scope.$parent.$parent.dataset,
                    DatasetService: DatasetService
                };

                modalService.openDialog('joinTable', data)
                    .then(function(savedDataset) {
                        joinDataCols = savedDataset.joinCols;
                        delete savedDataset.joinCols;
                        $scope.$parent.$parent.dataset = savedDataset;
                        $scope.loadJoinCols();
                    });

            };


            $scope.openFieldDialog = function (fieldName, firstRecord, custom, customFieldIndex, filterOnly, columnIndex) {


                var data = {
                    fieldName: fieldName,
                    firstRecord: firstRecord,
                    dataset: $scope.$parent.$parent.dataset,
                    availableTypeCoercions: availableTypeCoercions,
                    custom: custom,
                    customFieldIndex: customFieldIndex,
                    filterOnly: filterOnly,
                    columnIndex: columnIndex
                };


                modalService.openDialog('field', data)
                    .then(function(savedDataset) {
                        $scope.$parent.$parent.dataset = savedDataset;
                        $scope.coercionScheme = angular.copy(savedDataset.raw_rowObjects_coercionScheme);
                        sortColumnsByDisplayOrder();
                        $scope.vm.dataForm.$setDirty();
                        if(filterOnly) {
                            $scope.openFabricatedFilterDialog();
                        }
                    }, function() {

                        if(filterOnly) {
                            $scope.openFabricatedFilterDialog();
                        }
                    });

            };

            $scope.openNestedDialog = function () {

                var data =  {
                    dataset: $scope.$parent.$parent.dataset,
                    additionalDatasources: $scope.$parent.$parent.additionalDatasources
                };

                modalService.openDialog('nested', data)
                    .then(function(result) {

                        $scope.$parent.$parent.dataset = result.dataset;
                        $scope.$parent.$parent.additionalDatasources = result.additionalDatasources;

                        $scope.coercionScheme = angular.copy(result.dataset.raw_rowObjects_coercionScheme);
                        sortColumnsByDisplayOrder();

                        $scope.vm.dataForm.$setDirty();

                    }, function() {
                    // console.log('You cancelled the nested dialog.');
                    });

            };

            $scope.openFabricatedFilterDialog = function () {

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


                var data = {

                    dataset: dataset,
                    colsAvailable: colsAvailable,
                    fields: $scope.originalFields,
                    openFieldDialog: $scope.openFieldDialog

                };

                modalService.openDialog('fabricated', data)
                    .then(function (savedDataset) {
                        $scope.$parent.$parent.dataset = savedDataset;
                        $scope.vm.dataForm.$setDirty();
                    }, function () {
                        // console.log('You cancelled the fabricated filter dialog.');
                    });
            };

            $scope.openImageScrapingDialog = function () {

                var data = {
                    dataset: $scope.$parent.$parent.dataset
                };

                modalService.openDialog('imageScraping', data)
                    .then(function (savedDataset){
                        $scope.$parent.$parent.dataset = savedDataset;
                        sortColumnsByDisplayOrder();
                        $scope.vm.dataForm.$setDirty();
                    }, function () {
                        // console.log('You cancelled the image scraping dialog.');
                    });
            };


            $scope.openJoinDialog = function() {
                var data = {
                    dataset: $scope.$parent.$parent.dataset,
                    fields: $scope.originalFields
                };

                modalService.openDialog('join', data)

                    .then(function (savedDataset) {

                        $scope.$parent.$parent.dataset = savedDataset;
                        sortColumnsByDisplayOrder();

                        $scope.vm.dataForm.$setDirty();
                    }, function () {
                        // console.log('You cancelled the dataset join dialog.');
                    });
            };


            function sortColumnsByDisplayOrder() {

                $scope.data.fields = $scope.originalFields = $scope.$parent.$parent.dataset.columns.concat(
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
                    $scope.$parent.$parent.dataset.fe_nestedObject.fields.map(function(field) {

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
                    // $scope.$parent.$parent.dataset.imageScraping.reduce(function(imageScraping1, imageScraping2) {
                    //     var setFields1 = imageScraping1.setFields || [],
                    //         setFields2 = imageScraping2.setFields || [];


                    //     return setFields1.map(function(field) {

                    //         return {
                    //             name: field.newFieldName,
                    //             sample: null,
                    //             custom: true
                    //         };
                    //     }).concat(setFields2.map(function(field) {


                    //         return {
                    //             name: field.newFieldName,
                    //             sample: null,
                    //             custom: true
                    //         };


                    //     }));
                    // }, [])
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

                $scope.originalFields.sort(function (column1, column2) {
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
                stop: function () { // unused: e, ui
                    $scope.$parent.$parent.dataset.fe_fieldDisplayOrder =
                        $scope.originalFields.map(function (field) {
                            return field.name;
                        });

                    $scope.vm.dataForm.$setDirty();
                },

                disabled: $scope.$parent.$parent.dataset.connection

            };

            $scope.saveRequiredFields = function() {

                $scope.$parent.$parent.dataset.objectTitle = $scope.data.objectTitle;

                $scope.$parent.$parent.dataset.includeEmptyFields = $scope.dataset.includeEmptyFields;

                if (!$scope.$parent.$parent.dataset.fe_image || $scope.data.fe_image.field !== $scope.$parent.$parent.dataset.fe_image.field ||
                    $scope.data.fe_image.overwrite !== $scope.$parent.$parent.dataset.fe_image.overwrite) {


                    if ($scope.data.fe_image.field !== $scope.$parent.$parent.dataset.fe_image.field) {
                        $scope.data.fe_image.scraped = false;
                    }
                    if ($scope.data.fe_image.field !== '') {
                        $scope.setDirty(4);
                    }  else {
                        delete $scope.data.fe_image.field;
                    }

                }

                if ($scope.$parent.$parent.dataset.dirty == 1 || $scope.$parent.$parent.dataset.dirty == 2) {
                    $scope.data.fe_image.overwrite = false;
                }

                $scope.$parent.$parent.dataset.fe_image = $scope.data.fe_image;

                // TODO do this in process.js, not here?
                // although both dataset and $parent.$parent.dataset are lost between states
                if (dataset.firstImport == 2) $scope.$parent.$parent.dataset.firstImport = 3;
            };

            $scope.reset = function () {
                $scope.$parent.$parent.dataset = angular.copy(dataset);

                if (!dataset.columns) return;

                $scope.data = {};
                $scope.coercionScheme = angular.copy(dataset.raw_rowObjects_coercionScheme);
                // TODO Put object title <label> back in <md-input-container>
                // and set objectTitle default as first field (below).
                // In initial attempts, $scope.data.objectTitle was not being properly saved.
                $scope.data.objectTitle = dataset.objectTitle;
                $scope.data.fe_image = dataset.fe_image;

                sortColumnsByDisplayOrder();

                if ($scope.vm) $scope.vm.dataForm.$setPristine();
            };

            // ----------------------------------------------------
            // I think this was left over from when we had the data types in the dropdown - am leaving for now, in case we re-implement the dropdown
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
            $scope.overwriteDisabled = false;

            $scope.updateOverwrite = function() {

                if ($scope.data.fe_image == null || $scope.data.fe_image.field == '' ) return;

                if ($scope.data.fe_image.field !==  $scope.$parent.$parent.dataset.fe_image.field) {
                    $scope.data.fe_image.overwrite = true;
                    $scope.overwriteDisabled = true;
                } else {
                    $scope.data.fe_image.overwrite = $scope.$parent.$parent.dataset.fe_image.overwrite;
                    $scope.overwriteDisabled = false;
                }
            };

            $scope.submitForm = function (isValid) {

                //Save settings primary key and object title as set in the ui
                $scope.saveRequiredFields();

                // console.log($scope.$parent.$parent.dataset)

                if (isValid) {
                    $scope.submitting = true;

                    var errorHandler = function (error) {
                        $scope.submitting = false;
                        $mdToast.show(
                            $mdToast.simple()
                                .textContent(error)
                                .position('top right')
                                .hideDelay(3000)
                        );
                    };
                    var done = function() {
                        $scope.submitting = false;
                        $scope.setRemindUserUnsavedChanges(false);

                        $mdToast.show(
                            $mdToast.simple()
                                .textContent('Visualization updated!')
                                .position('top right')
                                .hideDelay(3000)
                        );

                        _nextTab();

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
                        delete finalizedDatasource.objectTitle;
                        delete finalizedDatasource.fe_excludeFields;
                        delete finalizedDatasource.fe_displayTitleOverrides;
                        delete finalizedDatasource.fe_fieldDisplayOrder;
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
