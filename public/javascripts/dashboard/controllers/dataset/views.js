angular.module('arraysApp')
    .controller('DatasetViewsCtrl', ['$scope', 'dataset','views', 'viewResource','$mdDialog','DatasetService', '$mdToast','$state','$filter', 'AssetService','user',
        function($scope, dataset,views,viewResource,$mdDialog,DatasetService,$mdToast,$state,$filter,AssetService,user) {
            $scope.$parent.$parent.dataset = dataset;

            $scope.$parent.$parent.views = views;

            if (!$scope.$parent.$parent.dataset.fe_views) {
                $scope.$parent.$parent.dataset.fe_views = {};
            }


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

            $scope.$watch('submitting',function(sub) {
                $scope.primaryAction.disabled = (sub == true);
            });

            $scope.tutorial.message = 'Here you can configure each view you want to use to visualize your data.\nClick \'Next\' to continue.';

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

            $scope.makeDefaultView = function(viewName) {
                $scope.data.default_view = viewName;
                $scope.makeViewVisible();
            };

            $scope.makeViewVisible = function() {
                if (!dataset.fe_views.views) {
                    dataset.fe_views.views = {};
                }

                if (!dataset.fe_views.views[$scope.data.default_view]) {
                    dataset.fe_views.views[$scope.data.default_view] = {visible: true};
                } else {
                    dataset.fe_views.views[$scope.data.default_view].visible = true;
                }

            };

            $scope.customViews = [];

            for (var i = 0; i < views.length; i++) {

                if (views[i]._team) {

                    $scope.customViews.push(views[i].name);

                    if (!$scope.data.default_view) {
                        $scope.makeDefaultView(views[i].name);
                    }
                }
            }

            if (!$scope.data.default_view) {
                $scope.makeDefaultView('gallery');
            }


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
                            // hide 'Advanced' tabs from all but superAdmin
                            viewTabs: data.tabs.filter(function(tabName){
                                if(user.role !== 'superAdmin') {
                                    return tabName !== 'Advanced';
                                } else {
                                    return tabName;
                                }
                            }),
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
            // open modal on load, for testing
            // $scope.openViewDialog(null, "581942ad8f220a84e42ef52c"); // barChart
            // $scope.openViewDialog(null, "581a83b24fc526c798a72559"); // lineGraph
            // $scope.openViewDialog(null, "581b6a7dd1284154a885d09d"); // pieSet
            // $scope.openViewDialog(null, "5817b73e4fc526c798a72554"); // gallery
            // $scope.openViewDialog(null, "581af68aafb074615368829b"); // scatterplot
            // $scope.openViewDialog(null, "5817b7cf4fc526c798a72555"); // timeline
            // $scope.openViewDialog(null, "581d2b83d1284154a885d0b3"); // wordCloud
            // $scope.openViewDialog(null, "5851e8fa9daaffbe4871bd04"); // map
            // $scope.openViewDialog(null, "5851e8eb9daaffbe4871bd03"); // pieChart

            $scope.reset = function () {
                $scope.data.default_view = $scope.$parent.$parent.dataset.fe_views.default_view;
                $scope.$parent.$parent.dataset = angular.copy(dataset);
                $scope.vm.viewsForm.$setPristine();
            };


            $scope.submitForm = function (isValid) {
                $scope.$parent.$parent.dataset.fe_views.default_view = $scope.data.default_view;

                if (isValid) {

                    $scope.submitting = true;
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
                            $scope.submitting = false;
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
                            $scope.submitting = false;
                            $mdToast.show(
                                $mdToast.simple()
                                    .textContent(error)
                                    .position('top right')
                                    .hideDelay(5000)
                            );
                        });
                }
            };


            function ViewDialogController($scope, $mdDialog, $filter, viewName,belongsToTeam,viewDisplayName,dataset,viewSetting,viewTabs,colsAvailable,AssetService,
                DatasetService,team,default_view,reimportStep) {

                $scope.viewName = viewName;
                $scope.viewDisplayName = viewDisplayName;
                $scope.viewSetting = viewSetting;
                $scope.viewTabs = viewTabs;
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

                // unused
                // var getPkeyFromDatasource = function(title,importRevision) {
                //     var uid = title.toLowerCase().replace(/[^A-Z0-9]+/ig, '_');
                //     return uid + '-r' + importRevision;
                // };


                $scope.loadDatasetsForMapping = function() {

                    if ($scope.otherAvailableDatasets.length == 0 && $scope.otherDatasetsloaded==false) {

                        DatasetService.getDatasetsWithQuery({_team: team._id})
                            .then(function (all) {
                                $scope.otherDatasetsloaded = true;
                                for (var i = 0; i < all.length; i++) {
                                    if (all[i].title !== dataset.title) {
                                        var mappingPkey = all[i]._id;
                                        // var mappingPkey = getPkeyFromDatasource(all[i].title,
                                        //     all[i].importRevision);
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
                };

                $scope.initIcons = function(settingName) {
                    assignNestedDataValues(settingName);

                    $scope.loadIcons();
                };

                $scope.removeIconField = function(settingName, index) {
                    $scope.data[settingName].conditions.splice(index, 1);
                };

                $scope.initBackgroundColors = function(settingName) {
                    assignNestedDataValues(settingName);
                };


                $scope.initBackgroundColors = function(settingName) {
                    assignNestedDataValues(settingName);
                };


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
                    // assets is the only thing that is constant so we can split on it and then prepend it back on the relative url
                    var splitUrl = Url.split('assets')[1];
                    var relativeUrl = '/assets' + splitUrl;
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

                // save or cancel before navigating back to include a field
                // $scope.goToData = function() {
                //     if ($scope.viewForm.$dirty || $scope.viewForm.$valid) {
                //         // $scope.save();
                //     } else {
                //         // $scope.cancel();
                //     }
                //     $state.transitionTo('dashboard.dataset.data', {id: dataset._id}, {
                //         reload: true,
                //         inherit: false,
                //         notify: true
                //     });
                // };

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

                $scope.includeExcludeCol = function(col, array, isDefault) {
                    if(!isDefault) {
                        var ndex = array.indexOf(col);
                        if (ndex == -1) {
                            array.push(col);
                        } else {
                            array.splice(ndex, 1);
                        }
                    }
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

                /**
                 *  Set defaults here
                 *  TODO set these defaults per view,
                 *  not globally, once the new view-settings-from-JSON-not-Mongo
                 *  structure is in place
                **/

                var setViewSettingDefault = function(prop, def) {
                    if(typeof $scope.data[prop] == 'undefined') {
                        $scope.data[prop] = def;
                    }
                };

                switch (viewName) {
                case 'gallery':
                    setViewSettingDefault('defaultSortOrderDescending', false); // ascending
                    break;
                case 'map':
                case 'globe':
                    setViewSettingDefault('pointColor', '#FEB600'); // Arrays orange
                    break;
                }

                // get each menu without a default
                var menusWithoutDefaults = $scope.viewSetting.filter(function(setting) {
                    return setting.inputType == 'menu' && (typeof $scope.data[setting.name] == 'undefined');
                });

                // set menu default to first avaiable field, if able--otherwise no fields (of type) are available
                for (var i = 0; i < menusWithoutDefaults.length; i++) {
                    var thisMenu = menusWithoutDefaults[i];
                    var colsAvailableOfType = colsAvailable.filter($scope.DataTypeMatch(thisMenu.restrictColumnDataType));
                    if(colsAvailableOfType.length) {
                        $scope.data[thisMenu.name] = colsAvailableOfType[0];
                    }
                }

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
