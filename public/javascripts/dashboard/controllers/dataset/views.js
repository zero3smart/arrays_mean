angular.module('arraysApp')
    .controller('DatasetViewsCtrl', ['$scope', 'dataset', 'previewCopy', 'views', 'viewResource', '$mdDialog', 'DatasetService', '$mdToast', '$state', '$filter', 'AssetService', 'user', '$window', 'viewUrlService',
        function($scope, dataset, previewCopy, views, viewResource, $mdDialog, DatasetService, $mdToast, $state, $filter, AssetService, user, $window, viewUrlService) {
            $scope.$parent.$parent.dataset = dataset;

            $scope.$parent.$parent.views = views;

            $scope.previewCopy = previewCopy;

            if (!$scope.$parent.$parent.dataset.fe_views) {
                $scope.$parent.$parent.dataset.fe_views = {};
            }

            if ($scope.previewCopy) {
                $scope.$parent.$parent.dataset.fe_views = $scope.previewCopy.fe_views;
                $scope.primaryAction.text = '';
            }

            // never needs to be disabled--if it is not needed, it is hidden
            $scope.secondaryAction.disabled = false;

            // primary actions
            var _nextTab = function() {
                $state.transitionTo('dashboard.dataset.settings', {id: $scope.$parent.$parent.dataset._id}, {
                    reload: true,
                    inherit: false,
                    notify: true
                });
            };
            var _viewViz = function() {
                var url = viewUrlService.getViewUrl($scope.subdomain, dataset, dataset.fe_views.default_view, false);
                $window.open(url, '_blank');
            };


            // $scope.$watch('vm.viewsForm.$valid', function(validity) {
            //     if (validity !== undefined) {
            //         $scope.formValidity = validity;
            //         $scope.primaryAction.disabled = !validity && $scope.vm.viewsForm.$dirty;
            //     }
            // });

            $scope.$watch('previewCopy', function(previewExist) {

                if (dataset.imported && dataset.dirty == 0 && previewExist !== null && previewExist._id) {
                    $scope.primaryAction.disabled = false;
                    $scope.primaryAction.text = dataset.firstImport ? 'Next' : 'Save';
                    $scope.primaryAction.do = $scope.submitForm;

                    /**
                     * Do not show if firstImport.
                     * Consistent with Content tab--also prevents endless Revert cycle on first import.
                     */
                    $scope.secondaryAction.text = !dataset.firstImport ? 'Revert' : '';

                    $scope.tutorial.message = 'DRAFT'; // workaround to display HTML in banner

                } else {

                    $scope.primaryAction.disabled = false;
                    $scope.primaryAction.text = dataset.firstImport ? 'Next' : 'View';
                    $scope.primaryAction.do = dataset.firstImport ? _nextTab : _viewViz;

                    $scope.secondaryAction.text = '';
                    $scope.tutorial.message = '';
                }
            });

            $scope.$watch('submitting', function(sub) {
                $scope.primaryAction.disabled = $scope.primaryAction.disabled || (sub == true) ;
            });

            $scope.secondaryAction.do = function() { // revert changes
                $scope.submitting = true;
                DatasetService.draftAction($scope.$parent.$parent.dataset._id, 'revert')
                    .then(function(response) {
                        $scope.submitting = false;
                        if (response.status == 200 && response.data) {

                            $scope.previewCopy = null;

                            $scope.$parent.$parent.dataset.fe_views = dataset.fe_views;

                            $mdToast.show(
                                $mdToast.simple()
                                    .textContent('Changes reverted.')
                                    .position('top right')
                                    .hideDelay(3000)
                            );

                            // simplest way to refresh page content, although causes flash
                            // TODO reset view visibiliy checkboxes and default view indicators
                            $state.reload();
                        }
                    }, function(err) {
                        $scope.submitting = false;
                        //console.log(error);
                        $mdToast.show(
                            $mdToast.simple()
                                .textContent(err)
                                .position('top right')
                                .hideDelay(5000)
                        );

                    });


            };


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
                return !dataset.fe_excludeFields[fieldName];
            });


            $scope.data = {};
            $scope.data.default_view = $scope.$parent.$parent.dataset.fe_views.default_view;


            // Use this to INITIALIZE the default view
            $scope.initDefaultView = function(viewName) {
                $scope.data.default_view = viewName;

                $scope.setViewVisibility(viewName, true);
            };

            // Use this to SET the default view, if view is visible
            $scope.setDefaultView = function(viewName) {
                if (dataset.fe_views.views[viewName] && dataset.fe_views.views[viewName].visible) {
                    $scope.data.default_view = viewName;
                }
                $scope.saveViewSettingToDraft();
            };

            $scope.setViewVisibility = function(viewName, visibility) {

                if (!$scope.$parent.$parent.dataset.fe_views.views) {
                    $scope.$parent.$parent.dataset.fe_views.views = {};
                }

                if (!$scope.$parent.$parent.dataset.fe_views.views[viewName]) {
                    $scope.$parent.$parent.dataset.fe_views.views[viewName] = {visible: visibility};
                } else {
                    $scope.$parent.$parent.dataset.fe_views.views[viewName].visible = visibility;

                }

                $scope.saveViewSettingToDraft();
            };

            $scope.saveViewSettingToDraft = function() {

                var finalizedDataset = angular.copy($scope.$parent.$parent.dataset);
                delete finalizedDataset.columns;
                finalizedDataset.fe_views.default_view = $scope.data.default_view;

                DatasetService.save(finalizedDataset)
                    .then(function(response) {

                        if (response.status == 200) {
                            var preview = response.data.preview;

                            if (preview) {
                                $scope.previewCopy = preview;
                                $scope.data.default_view = preview.fe_views.default_view;
                                $scope.$parent.$parent.dataset.fe_views.view = $scope.previewCopy.fe_views;

                            }

                        }


                    });

            };

            // for custom views, this will simply make the last custom view default?
            $scope.customViews = [];

            for (var i = 0; i < views.length; i++) {
                if (views[i]._team) {
                    $scope.customViews.push(views[i].name);

                    if (!$scope.$parent.$parent.dataset.fe_views.default_view) {
                        $scope.initDefaultView(views[i].name);
                    }
                }
            }


            if (!$scope.$parent.$parent.dataset.fe_views.default_view) {
                $scope.initDefaultView('gallery');
            }


            $scope.openViewDialog = function (evt, id) {

                viewResource.get({id: id}, function(data) {

                    $mdDialog.show({
                        controller: ViewDialogController,
                        templateUrl: 'templates/dataset/views.view.html',
                        parent: angular.element(document.body),
                        targetEvent: evt,
                        clickOutsideToClose: true,
                        fullscreen: true, // Only for -xs, -sm breakpoints.
                        locals: {
                            viewName: data.name,
                            belongsToTeam: data._team,
                            viewDisplayName: data.displayAs,
                            dataset: $scope.$parent.$parent.dataset,
                            viewSetting: data.settings,
                            // hide 'Advanced' tabs from all but superAdmin
                            viewTabs: data.tabs.filter(function (tabName){
                                if(data.name == 'wordCloud') {
                                    return tabName !== 'Menus'
                                }
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

                            /** If user saves changes to a view, make it visible */
                            savedDataset.fe_views.views[data.name].visible = true;

                            $scope.$parent.$parent.dataset = savedDataset;

                            $scope.data.default_view = savedDataset.fe_views.default_view;

                            $scope.saveViewSettingToDraft();

                            $scope.vm.viewsForm.$setDirty();
                        }, function () {
                            // console.log('You cancelled the dialog.');
                        });


                });
            };

            $scope.openViewPreview = function(viewName) {
                if (!dataset.dirty && $scope.previewCopy && $scope.previewCopy.fe_views.views[viewName]) {
                    var url = viewUrlService.getViewUrl($scope.subdomain, dataset, viewName, true);
                    $window.open(url, '_blank');
                }
            };

            $scope.reset = function () {
                $scope.data.default_view = $scope.$parent.$parent.dataset.fe_views.default_view;
                $scope.$parent.$parent.dataset = angular.copy(dataset);
                $scope.vm.viewsForm.$setPristine();
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


            $scope.submitForm = function () {

                // $scope.$parent.$parent.dataset.fe_views.default_view = $scope.data.default_view;

                if ($scope.previewCopy && $scope.previewCopy._id) {

                    $scope.submitting = true;

                    DatasetService.draftAction($scope.$parent.$parent.dataset._id, 'apply')
                        .then(function(response) {
                            $scope.submitting = false;
                            if (response.status == 200 && response.data.finalView) {

                                $scope.previewCopy = null;
                                $scope.$parent.$parent.dataset.fe_views = response.data.finalView;

                                $mdToast.show(
                                $mdToast.simple()
                                    .textContent('Visualization updated!')
                                    .position('top right')
                                    .hideDelay(3000)
                                );

                                if (dataset.firstImport == 3) {
                                    dataset.firstImport = 0; // not 4--you've made it
                                    $state.transitionTo('dashboard.dataset.settings', {id: $scope.$parent.$parent.dataset._id}, {
                                        reload: true,
                                        inherit: false,
                                        notify: true
                                    });
                                }

                            }
                        }, function(err) {
                            $scope.submitting = false;
                        //console.log(error);
                            $mdToast.show(
                            $mdToast.simple()
                                .textContent(err)
                                .position('top right')
                                .hideDelay(5000)
                        );

                        });


                    // var finalizedDataset = angular.copy($scope.$parent.$parent.dataset);
                    // delete finalizedDataset.columns;
                    // DatasetService.save(finalizedDataset)
                    //     .then(function (response) {
                    //         $scope.submitting = false;
                    //         if (response.status == 200) {
                    //             var id = response.data.id;
                    //             $mdToast.show(
                    //                 $mdToast.simple()
                    //                     .textContent('Visualization updated!')
                    //                     .position('top right')
                    //                     .hideDelay(3000)
                    //             );

                    // var useCustomView = false;


                    // for (var key in finalizedDataset.fe_views.views) {

                    //     if ($scope.customViews.indexOf(key) >= 0 && finalizedDataset.fe_views.views[key].visible==true) {
                    //         useCustomView = true;
                    //         break;
                    //     }
                    // }


                    // finalizedDataset.useCustomView = useCustomView;

                    // DatasetService.save(finalizedDataset)
                    //     .then(function (response) {
                    //         $scope.submitting = false;
                    //         if (response.status == 200) {
                    //             var id = response.data.id;
                    //             $mdToast.show(
                    //                 $mdToast.simple()
                    //                     .textContent('Visualization updated!')
                    //                     .position('top right')
                    //                     .hideDelay(3000)
                    //             );

                    //             $state.transitionTo('dashboard.dataset.settings', {id: id}, {
                    //                 reload: true,
                    //                 inherit: false,
                    //                 notify: true
                    //             });

                    //         }

                    //     }, function (error) {
                    //         $scope.submitting = false;
                    //         $mdToast.show(
                    //             $mdToast.simple()
                    //                 .textContent(error)
                    //                 .position('top right')
                    //                 .hideDelay(5000)
                    //         );
                    //     });
                }
            };


            function ViewDialogController($scope, $mdDialog, $filter, viewName, belongsToTeam, viewDisplayName, dataset, viewSetting, viewTabs, colsAvailable, AssetService,
                DatasetService, team, default_view, reimportStep) {

                $scope.viewName = viewName;
                $scope.viewDisplayName = viewDisplayName;
                $scope.viewSetting = viewSetting;
                $scope.viewTabs = viewTabs;
                $scope.isDefault = false;
                $scope.colsAvailable = colsAvailable;
                $scope.otherAvailableDatasets = [];
                $scope.otherDatasetsloaded = false;
                $scope.otherDatasetCols = {};
                $scope.isCustomView = !!belongsToTeam;
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

                    if ($scope.otherAvailableDatasets.length == 0 && $scope.otherDatasetsloaded == false) {

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
                    if (!$scope.dataset.fe_views.default_view) {
                        $scope.dataset.fe_views.default_view = dataset.fe_views.view.default_view;
                    }

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

                        if (typeof $scope.data[setting_name] == 'undefined' && viewSetting[i].inputType == 'keyValue') {
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

                $scope.addMore = function (field, pushType) {
                    if (pushType == 'object') {
                        field.push({});
                    } else {
                        field.push('');
                    }
                };

                $scope.isArray = function(requireType) {
                    if (Array.isArray(requireType)) {
                        return true;
                    }
                    return false;
                };

                $scope.DataTypeMatch = function(requireType) {

                    var requireTypeArray = function(lowercase, requireTypes) {
                        for (var i = 0; i < requireType.length; i++) {
                            if (lowercase.indexOf(requireType[i].toLowerCase()) >= 0) {
                                return true;
                            }
                        }
                        return false;
                    };

                    var returnDataTypeMatch = function (requireType) {


                        return function(col) {

                            if (typeof requireType !== 'undefined') {
                                if ($scope.dataset.raw_rowObjects_coercionScheme[col] &&
                                    $scope.dataset.raw_rowObjects_coercionScheme[col].operation) {

                                    var lowercase = $scope.dataset.raw_rowObjects_coercionScheme[col].operation.toLowerCase();
                                    if ($scope.isArray(requireType)) {
                                        return requireTypeArray(lowercase, requireType);
                                    }
                                    return lowercase.indexOf(requireType.toLowerCase()) >= 0;
                                }

                                return false;
                            }
                            return true;

                        };
                    };


                    return returnDataTypeMatch(requireType);
                };

                $scope.AppendNumberOfItems = function(menu, cols) {
                    if (menu == 'Aggregate By') {
                        cols.push('Number of Items');
                    }
                    return cols;
                };

                $scope.includeExcludeCol = function(col, array, isDefault, forceExclude) {
                    if(!isDefault) {
                        var ndex = array.indexOf(col);
                        if (ndex == -1) {
                            array.push(col);
                        } else if (!forceExclude) {
                            array.splice(ndex, 1);
                        }
                    }
                };

                $scope.excludeAllFromMenu = true; // setting this for all menus, for now

                $scope.includeExcludeColsFromMenu = function(colsAvailableOfType, excludeByArray, menuDefault, currentMenuDisplayName) {

                    for (var i = 0; i < colsAvailableOfType.length; i++) {
                        var col = colsAvailableOfType[i];
                        $scope.includeExcludeCol(col, excludeByArray, menuDefault == col, $scope.excludeAllFromMenu);
                    }

                    $scope.excludeAllFromMenu = !$scope.excludeAllFromMenu;
                };

                $scope.excludeBy = function(excludeValueArray) {
                    return function(Input) {

                        if (typeof excludeValueArray !== 'undefined') {
                            return excludeValueArray.indexOf(Input) == -1;
                        }
                        return true;
                    };
                };

                $scope.remove = function(setting, index) {
                    $scope.data[setting].splice(index, 1);
                };


                $scope.notChosen = function(arrayOfObject, target, index) {
                    for (var i = 0; i < arrayOfObject.length ;i++) {
                        if (index !== i) {
                            if (arrayOfObject[i].key == target) {
                                return false;
                            }
                        }
                    }
                    return true;
                };


                $scope.checkDuplicateKey = function(list, $index) {
                    return function(col) {

                        return $scope.notChosen(list, col, $index);
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
                    setViewSettingDefault('coordColor', '#FEB600'); // Arrays orange
                    break;
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
                        $scope.dataset.dirty = ($scope.dataset.dirty == 1) ? 1 : $scope.reimportStep;
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
