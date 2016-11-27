angular.module('arraysApp')
    .controller('DatasetViewsCtrl', ['$scope', 'dataset','views', 'viewResource','$mdDialog',
        function($scope, dataset,views,viewResource,$mdDialog) {
            $scope.$parent.$parent.dataset = dataset;
            $scope.$parent.$parent.views = views;
            $scope.$parent.$parent.currentNavItem = 'Views';

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
	                    }
	                })
	                    .then(function (savedDataset) {
	                       $scope.$parent.$parent.dataset = savedDataset;
                            $scope.viewsForm.$setDirty();
	                    }, function () {
	                        console.log('You cancelled the dialog.');
	                    });



            	})
            };


            $scope.reset = function () {
                $scope.$parent.$parent.dataset = angular.copy(dataset);
                $scope.viewsForm.$setPristine();
            };

            $scope.submitForm = function (isValid) {
                if (isValid) {
                    // var finalizedDataset = angular.copy($scope.$parent.$parent.dataset);
                    // finalizedDataset.fn_new_rowPrimaryKeyFromRowObject = $filter('dotless')($scope.data.primaryKey);
                    // delete finalizedDataset.firstRecord;
                    // delete finalizedDataset.colNames;

                    // console.log(finalizedDataset);

                    // DatasetService.save(finalizedDataset)
                    //     .then(function (id) {
                    //         $mdToast.show(
                    //             $mdToast.simple()
                    //                 .textContent('Dataset updated successfully!')
                    //                 .position('top right')
                    //                 .hideDelay(3000)
                    //         );

                    //         $state.transitionTo('admin.dataset.views', {id: id}, {
                    //             reload: true,
                    //             inherit: false,
                    //             notify: true
                    //         });
                    //     }, function (error) {
                    //         $mdToast.show(
                    //             $mdToast.simple()
                    //                 .textContent(error)
                    //                 .position('top right')
                    //                 .hideDelay(5000)
                    //         );
                    //     });
                }
            }






            function ViewDialogController($scope, $mdDialog, $filter, viewName,viewDisplayName,dataset,viewSetting) {

                $scope.viewName = viewName;
                $scope.viewDisplayName = viewDisplayName;
				$scope.viewSetting = viewSetting;
                $scope.isDefault = false;
          

                $scope.availableForDuration = [ "Decade", "Year", "Month", "Day"];


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
                    if ($scope.dataset.fe_views.default_view == viewName) {
                        $scope.isDefault = true;
                    } else {
                        $scope.isDefault = false;
                    }
                    $scope.data = {};
                    for (var i = 0; i < viewSetting.length; i++) {
                        var setting_name = viewSetting[i].name;
                        $scope.data[setting_name] =  $scope.dataset.fe_views.views[viewName][setting_name];

                    }
                };

                $scope.reset();

             

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
                        $scope.dataset.default_view = viewName;
                    } 
                    $scope.dataset.fe_views.views[viewName] = $scope.data;
                    $mdDialog.hide($scope.dataset);
                };
            }







        }
    ]);