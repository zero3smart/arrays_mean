angular.module('arraysApp')
    .controller('DatasetViewsCtrl', ['$scope', 'dataset','views', 'viewResource','$mdDialog','DatasetService', '$mdToast','$state','$filter', 'AssetService',
        function($scope, dataset,views,viewResource,$mdDialog,DatasetService,$mdToast,$state,$filter,AssetService) {
            $scope.$parent.$parent.dataset = dataset;

            $scope.$parent.$parent.views = views;

            $scope.primaryAction.text = 'Next';
            $scope.$watch('vm.viewsForm.$valid', function(validity) {
                if (validity !== undefined) {
                    $scope.formValidity = validity;
                    $scope.primaryAction.disabled = !validity;
                }
            });
            $scope.primaryAction.do = function() {
                $scope.submitForm($scope.formValidity);
            };

            $scope.customViews = [];

            for (var i = 0; i < views.length; i++) {

                if (views[i]._team) {

                    $scope.customViews.push(views[i].name);

                    if (!$scope.$parent.$parent.dataset.fe_views) {
                        $scope.$parent.$parent.dataset.fe_views = {};
                        $scope.$parent.$parent.dataset.fe_views.default_view = views[i].name;
                    }
                }
            }


            if (!$scope.$parent.$parent.dataset.fe_views) {
                $scope.$parent.$parent.dataset.fe_views = {};
                $scope.$parent.$parent.dataset.fe_views.default_view = 'gallery';
                $scope.$parent.$parent.dataset.fe_views.views = {};
                $scope.$parent.$parent.dataset.fe_views.views.gallery = {visible: true};

            }


            $scope.$parent.$parent.currentNavItem = 'views';


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
            colsAvailable = colsAvailable.filter(function(fieldName){
                return !$scope.dataset.fe_excludeFields[fieldName];
            });



            $scope.data = {};

            $scope.data.default_view = dataset.fe_views.default_view;

            $scope.makeDefaultView = function(view) {
                $scope.data.default_view = view.name;
                $scope.makeViewVisible();
            }

            $scope.makeViewVisible = function() {
                if (!dataset.fe_views.views[$scope.data.default_view]) {
                    dataset.fe_views.views[$scope.data.default_view] = {visible: true};
                } else {
                    dataset.fe_views.views[$scope.data.default_view].visible = true;
                }

            };



            $scope.openViewDialog = function (evt, id) {



                viewResource.get({id:id},function(data) {

                    $mdDialog.show({
                        controller: ViewDialogController,
                        templateUrl: 'templates/dataset/views.view.html',
                        parent: angular.element(document.body),
                        targetEvent: evt,
                        clickOutsideToClose: true,
                        fullscreen: true, // Only for -xs, -sm breakpoints.
                        locals: {
                            viewName: data.name,
                            belongsToTeam : data._team,
                            viewDisplayName: data.displayAs,
                            dataset: $scope.$parent.$parent.dataset,
                            viewSetting: data.settings,
                            colsAvailable: colsAvailable,
                            team: $scope.$parent.$parent.team,
                            default_view: $scope.data.default_view,
                            reimportStep: data.reimportStep
                        }
                    })
                        .then(function (savedDataset) {
                            $scope.$parent.$parent.dataset = savedDataset;

                            $scope.data.default_view = savedDataset.fe_views.default_view;
                            $scope.vm.viewsForm.$setDirty();
                        }, function () {
                            // console.log('You cancelled the dialog.');
                        });



                });
            };


            $scope.reset = function () {
                $scope.data.default_view = $scope.$parent.$parent.dataset.fe_views.default_view;
                $scope.$parent.$parent.dataset = angular.copy(dataset);
                $scope.vm.viewsForm.$setPristine();
            };


            $scope.submitForm = function (isValid) {
                $scope.$parent.$parent.dataset.fe_views.default_view = $scope.data.default_view;

                if (isValid) {
                    var finalizedDataset = angular.copy($scope.$parent.$parent.dataset);
                    delete finalizedDataset.columns;

                    var useCustomView = false;




                    for (var key in finalizedDataset.fe_views.views) {

                        if ($scope.customViews.indexOf(key) >= 0 && finalizedDataset.fe_views.views[key].visible==true) {
                            useCustomView = true;
                            break;
                        }
                    }



                    finalizedDataset.useCustomView = useCustomView;

                    DatasetService.save(finalizedDataset)
                        .then(function (response) {
                            if (response.status == 200) {
                                var id = response.data.id;
                                $mdToast.show(
                                    $mdToast.simple()
                                        .textContent('Dataset updated successfully!')
                                        .position('top right')
                                        .hideDelay(3000)
                                );

                                $state.transitionTo('dashboard.dataset.settings', {id: id}, {
                                    reload: true,
                                    inherit: false,
                                    notify: true
                                });

                            }

                        }, function (error) {
                            $mdToast.show(
                                $mdToast.simple()
                                    .textContent(error)
                                    .position('top right')
                                    .hideDelay(5000)
                            );
                        });
                }
            };


            function ViewDialogController($scope, $mdDialog, $filter, viewName,belongsToTeam,viewDisplayName,dataset,viewSetting,colsAvailable,AssetService,
                DatasetService,team,default_view,reimportStep) {

                $scope.viewName = viewName;
                $scope.viewDisplayName = viewDisplayName;
                $scope.viewSetting = viewSetting;
                $scope.isDefault = false;
                $scope.colsAvailable = colsAvailable;
                $scope.otherAvailableDatasets = [];
                $scope.otherDatasetsloaded = false;
                $scope.otherDatasetCols = {};
                $scope.isCustomView = belongsToTeam? true: false;
                $scope.reimportStep = reimportStep;


                $scope.availableForDuration = [ 'Decade', 'Year', 'Month', 'Day'];

                $scope.loadIcons = function() {

                    AssetService.loadIcons()
                    .then(function(data) {
                        $scope.iconsUrl = data;
                    });

                };

                var getPkeyFromDatasource = function(title,importRevision) {
                    var uid = title.toLowerCase().replace(/[^A-Z0-9]+/ig, '_');
                    return uid + '-r' + importRevision;
                };




                $scope.loadDatasetsForMapping = function() {

                    if ($scope.otherAvailableDatasets.length == 0 && $scope.otherDatasetsloaded==false) {

                        DatasetService.getDatasetsWithQuery({_team: team._id})
                            .then(function (all) {
                                $scope.otherDatasetsloaded = true;
                                for (var i = 0; i < all.length; i++) {
                                    if (all[i].title !== dataset.title) {
                                        var mappingPkey = getPkeyFromDatasource(all[i].title,
                                            all[i].importRevision);
                                        $scope.otherAvailableDatasets.push({
                                            displayAs: all[i].title, mappingPkey: mappingPkey
                                        });
                                    }
                                }
                            });

                    }
                };

                $scope.loadDatasetColumnsByPkey = function(pKey) {

                    $scope.loading = true;
                    if (pKey && !$scope.otherDatasetCols[pKey]) {
                        DatasetService.getMappingDatasourceCols(pKey)
                        .then(function(cols) {
                            $scope.otherDatasetCols[pKey] = cols.data;
                            $scope.loading = false;
                        });
                    }
                };

                var assignNestedDataValues = function(settingName) {
                    if (!$scope.data[settingName]) {
                        $scope.data[settingName] = {};
                    }
                    if (!$scope.data[settingName].conditions) {
                        $scope.data[settingName].conditions = [];
                        $scope.data[settingName].conditions.push({});

                    }
                }



                $scope.initIcons = function(settingName) {
                    assignNestedDataValues(settingName);


                    $scope.loadIcons();
                };


                $scope.initBackgroundColors = function(settingName) {
                    assignNestedDataValues(settingName);
                }



                var findDependency = function (settingName) {
                    for (var i = 0; i < viewSetting.length; i++) {
                        if (viewSetting[i].name == settingName) {
                            return {name: settingName, display: viewSetting[i].displayAs};
                        }
                    }
                    return null;
                };

                $scope.checkDependency = function(selectFrom) {
                    if (selectFrom == 'column' || selectFrom == 'duration') {
                        return null;
                    } else {
                        return findDependency(selectFrom);
                    }
                };


                $scope.makeRelative = function(Url) {
                    subdomainIndex = Url.indexOf($scope.dataset._team.subdomain);
                    sliceIndex = subdomainIndex + $scope.dataset._team.subdomain.length;
                    relativeUrl = Url.slice(sliceIndex);
                    return relativeUrl;
                };


                $scope.reset = function () {
                    $scope.dataset = angular.copy(dataset);

                    if (!$scope.dataset.fe_views.views[viewName]) {
                        $scope.dataset.fe_views.views[viewName] = {};
                    }
                    if (default_view == viewName) {
                        $scope.isDefault = true;
                    } else {
                        $scope.isDefault = false;
                    }
                    $scope.data = {};
                    for (var i = 0; i < viewSetting.length; i++) {
                        var setting_name = viewSetting[i].name;
                        $scope.data[setting_name] =  $scope.dataset.fe_views.views[viewName][setting_name];

                        if (typeof $scope.data[setting_name] == 'undefined' && viewSetting[i].inputType =='keyValue') {
                            $scope.data[setting_name] = [];
                        }
                    }
                    $scope.data.visible =  $scope.dataset.fe_views.views[viewName].visible;
                    $scope.data.description = $scope.dataset.fe_views.views[viewName].description;
                };

                $scope.reset();

                // $scope.data.default_view = default_view;


                $scope.addMore = function (field,pushType) {
                    if (pushType == 'object') {
                        field.push({});
                    } else {
                        field.push('');
                    }
                };

                $scope.DataTypeMatch = function(requireType) {

                    return function(col) {

                        if (typeof requireType !== 'undefined') {
                            if ($scope.dataset.raw_rowObjects_coercionScheme[col] &&
                                $scope.dataset.raw_rowObjects_coercionScheme[col].operation) {

                                var lowercase = $scope.dataset.raw_rowObjects_coercionScheme[col].operation.toLowerCase();

                                return lowercase.indexOf(requireType.toLowerCase()) >= 0;
                            }

                            return false;
                        }

                        return true;

                    };
                };

                $scope.excludeBy = function(excludeValueArray) {
                    return function(Input) {

                        if (typeof excludeValueArray !== 'undefined') {
                            return excludeValueArray.indexOf(Input) == -1;
                        }
                        return true;
                    };
                };

                $scope.remove = function(setting,index) {
                    $scope.data[setting].splice(index,1);
                };


                $scope.notChosen= function(arrayOfObject,target,index) {
                    for (var i = 0; i <arrayOfObject.length ;i++) {
                        if (index !== i) {
                            if (arrayOfObject[i].key == target) {
                                return false;
                            }
                        }
                    }
                    return true;
                };


                $scope.checkDuplicateKey = function(list,$index) {
                    return function(col) {

                        return $scope.notChosen(list,col,$index);
                    };
                };


                $scope.cancel = function () {
                    $mdDialog.cancel();
                };

                $scope.save = function () {

                    if (typeof $scope.reimportStep !== 'undefined') {
                        $scope.dataset.dirty = ($scope.dataset.dirty == 1) ? 1: $scope.reimportStep;
                    }

                    if ($scope.isDefault == true) {
                        $scope.dataset.fe_views.default_view = viewName;
                    }

                    if ($scope.isDefault) {
                        if ($scope.isCustomView) {
                            $scope.dataset.useCustomView = true;
                        }

                    } else {
                        if ($scope.isCustomView && $scope.data.visible) {
                            $scope.dataset.useCustomView = true;
                        }

                    }

                    if ($scope.isCustomView) {
                        if ($scope.dataset.useCustomView) {
                            if (!$scope.data.visible) {
                                $scope.dataset.useCustomView = false;
                            }
                        } else {
                            if ($scope.data.visible || $scope.isDefault) {
                                $scope.dataset.useCustomView = true;
                            }
                        }
                    }

                    $scope.dataset.fe_views.views[viewName] = $scope.data;


                    $mdDialog.hide($scope.dataset);
                };
            }







        }
    ]);
