angular.module('arraysApp')
    .controller('DatasetViewsCtrl', ['$scope', 'dataset','views', 'viewResource','$mdDialog','DatasetService', '$mdToast','$state','$filter', 'AssetService',
        function($scope, dataset,views,viewResource,$mdDialog,DatasetService,$mdToast,$state,$filter,AssetService) {
            $scope.$parent.$parent.dataset = dataset;
            $scope.$parent.$parent.views = views;
            $scope.$parent.$parent.currentNavItem = 'Views';

            if (!$scope.$parent.$parent.dataset.fe_views) {
                $scope.$parent.$parent.dataset.fe_views = {};
                 $scope.$parent.$parent.dataset.fe_views.views = {};
            }

            var colsAvailable = dataset.columns.map(function(column) {
                return column.name;
            }).concat(dataset.customFieldsToProcess.map(function(customField) {
                return customField.fieldName;
            })).concat(dataset.fe_nestedObject.fields.map(function(fieldName) {
                if (dataset.fe_nestedObject.prefix)
                    return dataset.fe_nestedObject.prefix + fieldName;
                return fieldName;
            }).filter(function(fieldName){
                return !$scope.dataset.fe_excludeFields[fieldName];
            }));

            $scope.data = {};
            console.log(dataset);
            $scope.data.default_view = dataset.fe_views.default_view;

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
	                        viewDisplayName: data.displayAs,
	                        dataset: $scope.$parent.$parent.dataset,
	                        viewSetting: data.settings,
                            colsAvailable: colsAvailable
	                    }
	                })
	                    .then(function (savedDataset) {

                            // console.log(savedDataset);

	                       $scope.$parent.$parent.dataset = savedDataset;
                            $scope.vm.viewsForm.$setDirty();
	                    }, function () {
	                        console.log('You cancelled the dialog.');
	                    });



            	})
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
                    console.log(finalizedDataset.fe_views.default_view);
                    delete finalizedDataset.columns;

                    DatasetService.save(finalizedDataset)
                        .then(function (id) {
                            $mdToast.show(
                                $mdToast.simple()
                                    .textContent('Dataset updated successfully!')
                                    .position('top right')
                                    .hideDelay(3000)
                            );

                            $state.transitionTo('dashboard.dataset.done', {id: id}, {
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
            };


            function ViewDialogController($scope, $mdDialog, $filter, viewName,viewDisplayName,dataset,viewSetting,colsAvailable,AssetService,
                DatasetService) {

                $scope.viewName = viewName;
                $scope.viewDisplayName = viewDisplayName;
				$scope.viewSetting = viewSetting;
                $scope.isDefault = false;
                $scope.colsAvailable = colsAvailable;
                $scope.otherAvailableDatasets = [];
                $scope.otherDatasetsloaded = false;
                $scope.otherDatasetCols = {};
          

                $scope.availableForDuration = [ "Decade", "Year", "Month", "Day"];

                $scope.loadIcons = function() {

                    AssetService.loadIcons()
                    .then(function(data) {
                        $scope.iconsUrl = data;
                    })

                }

                var getPkeyFromDatasource = function(title,importRevision) {
                    var uid = title.toLowerCase().replace(/[^A-Z0-9]+/ig, "_");
                    return uid + '-r' + importRevision;
                }




                $scope.loadDatasetsForMapping = function() {
                    if ($scope.otherAvailableDatasets.length == 0 && $scope.otherDatasetsloaded==false) {

                            DatasetService.getAll()
                                .then(function(all) {
                                    $scope.otherDatasetsloaded = true;
                                    for (var i = 0; i < all.length; i++) {
                                        if (all[i].title !== dataset.title) {
                                            var mappingPkey = getPkeyFromDatasource(all[i].title,
                                                all[i].importRevision);
                                            $scope.otherAvailableDatasets.push({displayAs:all[i].title,mappingPkey:
                                            mappingPkey});
                                        }
                                    }
                                })

                    }
                

                }

                $scope.loadDatasetColumnsByPkey = function(pKey) {
                    if (pKey && !$scope.otherDatasetCols[pKey]) {
                        DatasetService.getMappingDatasourceCols(pKey)
                        .then(function(cols) {
                            $scope.otherDatasetCols[pKey] = cols; 
                        
                        })
                    }
                }



                $scope.initIcons = function(settingName) {
                    if (!$scope.data[settingName]) {
                        $scope.data[settingName] = {};
                    }
                    if (!$scope.data[settingName].conditions) {
                        $scope.data[settingName].conditions = [];
                        $scope.data[settingName].conditions.push({});

                    }
                  
                  
                    $scope.loadIcons();
                }



               var findDependency = function (settingName) {
                    for (var i = 0; i < viewSetting.length; i++) {
                        if (viewSetting[i].name == settingName) {
                            return {name: settingName, display: viewSetting[i].displayAs};
                        }
                    }
                    return null;
                }

                $scope.checkDependency = function(selectFrom) {
                    if (selectFrom == 'column' || selectFrom == 'duration') {
                        return null;
                    } else {
                        return findDependency(selectFrom);
                    }
                }




                $scope.reset = function () {
                    $scope.dataset = angular.copy(dataset);

                    if (!$scope.dataset.fe_views.views[viewName]) {
                        $scope.dataset.fe_views.views[viewName] = {};
                    }
                    if ($scope.dataset.fe_views.default_view == viewName) {
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

                $scope.data.default_view = dataset.fe_views.default_view;
                console.log($scope.data.default_view);

                $scope.addMore = function (field,pushType) {
                    if (pushType == 'object') {
                        field.push({});
                    } else {
                        field.push("");
                    }
                }

                $scope.DataTypeMatch = function(requireType) {

                    return function(col) {
                        if (typeof requireType !== 'undefined') {
                            if ($scope.dataset.raw_rowObjects_coercionScheme[col] &&
                                $scope.dataset.raw_rowObjects_coercionScheme[col].operation) {

                                var lowercase = $scope.dataset.raw_rowObjects_coercionScheme[col].operation.toLowerCase();

                                return lowercase.indexOf(requireType.toLowerCase()) >= 0
                            }
                            return false;                       
                        }
                        return true;

                    }
                }

                $scope.keyExcludeBy = function(excludeValueArray) {
                    return function(Input) {
                        if (typeof excludeValueArray !== 'undefined') {
                            return excludeValueArray.indexOf(Input) == -1;

                        }
                        return true;
                    }
                }

                $scope.loadColumnsForMappingDataset = function() {

                }



                $scope.remove = function(setting,index) {
                    $scope.data[setting].splice(index,1);
                }


                $scope.notChosen= function(arrayOfObject,target,index) {
                    for (var i = 0; i <arrayOfObject.length ;i++) {
                        if (index !== i) {
                            if (arrayOfObject[i].key == target) {
                                return false;
                            }
                        }
                    }
                    return true;
                }


                $scope.checkDuplicateKey = function(list,$index) {
                    return function(col) {
                    
                       return $scope.notChosen(list,col,$index);
                    }
                }


                $scope.cancel = function () {
                    $mdDialog.cancel();
                };

                $scope.save = function () {

        

                    if ($scope.isDefault == true) {
                        $scope.dataset.fe_views.default_view = viewName;
                    } 
                    $scope.dataset.fe_views.views[viewName] = $scope.data;
                    $mdDialog.hide($scope.dataset);
                };
            }







        }
    ]);