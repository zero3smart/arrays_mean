angular.module('arraysApp')
    .controller('DatasetViewsCtrl', ['$scope', 'dataset','views', 'viewResource','$mdDialog',
        function($scope, dataset,views,viewResource,$mdDialog) {
            $scope.$parent.$parent.dataset = dataset;
            $scope.$parent.$parent.views = views;
            $scope.$parent.$parent.currentNavItem = 'Views';

            if ($scope.dataset.fe_designatedFields && $scope.dataset.fe_designatedFields.objectTitle) {
                $scope.dataset.colNames.unshift("Object Title");
                $scope.dataset.colNames.unshift("_all");
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
	                        viewDisplayName: data.displayAs,
	                        dataset: $scope.$parent.$parent.dataset,
	                        viewSetting: data.settings,
	                    }
	                })
	                    .then(function (savedDataset) {
	                        // $scope.$parent.$parent.dataset = savedDataset;
	                    }, function () {
	                        console.log('You cancelled the dialog.');
	                    });



            	})
            };

            function ViewDialogController($scope, $mdDialog, $filter, viewName,viewDisplayName,dataset,viewSetting) {

                $scope.viewName = viewName;
                $scope.viewDisplayName = viewDisplayName;
				$scope.viewSetting = viewSetting;
                $scope.isDefault = false;
          

                $scope.reset = function () {
                    $scope.dataset = angular.copy(dataset);
                    if ($scope.dataset.fe_views.default_view == viewName) {
                        $scope.isDefault = true;
                    } 

                    // $scope.data = {};

                    // // General
                    // if (!$scope.dataset.fe_designatedFields) $scope.dataset.fe_designatedFields = {};
                    // for (var key in $scope.dataset.fe_designatedFields) {
                    //     if ($scope.dataset.fe_designatedFields[key] == $scope.finalizedFieldName) {
                    //         $scope.data.designatedField = key;
                    //         break;
                    //     }
                    // }

                    // if (!$scope.dataset.fe_fieldDisplayOrder) $scope.dataset.fe_fieldDisplayOrder = [];
                    // var index = $scope.dataset.fe_fieldDisplayOrder.indexOf($scope.finalizedFieldName);
                    // if (index != -1) $scope.data.displayOrder = index;

                    // // Filter
                    // if (!$scope.dataset.fe_filters.fieldsNotAvailable) $scope.dataset.fe_filters.fieldsNotAvailable = [];
                    // $scope.data.filterNotAvailable = $scope.dataset.fe_filters.fieldsNotAvailable.indexOf($scope.finalizedFieldName) != -1;

                    // if (!$scope.dataset.fe_filters.fieldsCommaSeparatedAsIndividual) $scope.dataset.fe_filters.fieldsCommaSeparatedAsIndividual = [];
                    // $scope.data.commaSeparatedAsIndividual = $scope.dataset.fe_filters.fieldsCommaSeparatedAsIndividual.indexOf($scope.finalizedFieldName) != -1;

                    // if (!$scope.dataset.fe_filters.fieldsMultiSelectable) $scope.dataset.fe_filters.fieldsMultiSelectable = [];
                    // $scope.data.multipleSelection = $scope.dataset.fe_filters.fieldsMultiSelectable.indexOf($scope.finalizedFieldName) != -1;

                    // if (!$scope.dataset.fe_filters.fieldsSortableByInteger) $scope.dataset.fe_filters.fieldsSortableByInteger = [];
                    // $scope.data.sortableByInt = $scope.dataset.fe_filters.fieldsSortableByInteger.indexOf($scope.finalizedFieldName) != -1;

                    // if (!$scope.dataset.fe_filters.fieldsSortableInReverseOrder) $scope.dataset.fe_filters.fieldsSortableInReverseOrder = [];
                    // $scope.data.sortableInReverse = $scope.dataset.fe_filters.fieldsSortableInReverseOrder.indexOf($scope.finalizedFieldName) != -1;

                    // if (!$scope.dataset.fe_filters.oneToOneOverrideWithValuesByTitleByFieldName) $scope.dataset.fe_filters.oneToOneOverrideWithValuesByTitleByFieldName = {};

                    // if (!$scope.dataset.fe_filters.valuesToExcludeByOriginalKey) $scope.dataset.fe_filters.valuesToExcludeByOriginalKey = {};

                    // if (!$scope.dataset.fe_filters.keywords) $scope.dataset.fe_filters.keywords = [];
                    // $scope.data.keywords = $scope.dataset.fe_filters.keywords.find(function (elem) {
                    //     return elem.title == $scope.finalizedFieldName;
                    // });
                    // if (!$scope.data.keywords) $scope.data.keywords = {title: $scope.finalizedFieldName, choices: []};

                    // Nested
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







                $scope.cancel = function () {
                    $mdDialog.cancel();
                };

                $scope.save = function () {
                    // General

                    console.log($scope.dataset);
                    // if ($scope.data.designatedField != undefined)
                    //     $scope.dataset.fe_designatedFields[$scope.data.designatedField] = $scope.finalizedFieldName;
                    // else {
                    //     for (var key in $scope.dataset.fe_designatedFields) {
                    //         if ($scope.dataset.fe_designatedFields[key] == $scope.finalizedFieldName) {
                    //             delete $scope.dataset[key];
                    //             break;
                    //         }
                    //     }
                    // }

                    // var index = $scope.dataset.fe_fieldDisplayOrder.indexOf($scope.finalizedFieldName);
                    // if (index != -1) $scope.dataset.fe_fieldDisplayOrder.splice(index, 1);
                    // if ($scope.data.displayOrder) {
                    //     // TODO: Consider to shift the existing elements at the same position?
                    //     $scope.dataset.fe_fieldDisplayOrder.splice($scope.data.displayOrder, 0, $scope.finalizedFieldName);
                    // }

                    // // Filter
                    // index = $scope.dataset.fe_filters.fieldsNotAvailable.indexOf($scope.finalizedFieldName);
                    // if (index != -1) $scope.dataset.fe_filters.fieldsNotAvailable.splice(index, 1);
                    // if ($scope.data.filterNotAvailable) {
                    //     $scope.dataset.fe_filters.fieldsNotAvailable.push($scope.finalizedFieldName);
                    // }

                    // index = $scope.dataset.fe_filters.fieldsCommaSeparatedAsIndividual.indexOf($scope.finalizedFieldName);
                    // if (index != -1) $scope.dataset.fe_filters.fieldsCommaSeparatedAsIndividual.splice(index, 1);
                    // if ($scope.data.commaSeparatedAsIndividual) {
                    //     $scope.dataset.fe_filters.fieldsCommaSeparatedAsIndividual.push($scope.finalizedFieldName);
                    // }

                    // index = $scope.dataset.fe_filters.fieldsMultiSelectable.indexOf($scope.finalizedFieldName);
                    // if (index != -1) $scope.dataset.fe_filters.fieldsMultiSelectable.splice(index, 1);
                    // if ($scope.data.multipleSelection) {
                    //     $scope.dataset.fe_filters.fieldsMultiSelectable.push($scope.finalizedFieldName);
                    // }

                    // index = $scope.dataset.fe_filters.fieldsSortableByInteger.indexOf($scope.finalizedFieldName);
                    // if (index != -1) $scope.dataset.fe_filters.fieldsSortableByInteger.splice(index, 1);
                    // if ($scope.data.sortableByInt) {
                    //     $scope.dataset.fe_filters.fieldsSortableByInteger.push($scope.finalizedFieldName);
                    // }

                    // index = $scope.dataset.fe_filters.fieldsSortableInReverseOrder.indexOf($scope.finalizedFieldName);
                    // if (index != -1) $scope.dataset.fe_filters.fieldsSortableInReverseOrder.splice(index, 1);
                    // if ($scope.data.sortableInReverse) {
                    //     $scope.dataset.fe_filters.fieldsSortableInReverseOrder.push($scope.finalizedFieldName);
                    // }

                    // if ($scope.dataset.fe_filters.oneToOneOverrideWithValuesByTitleByFieldName[$scope.finalizedFieldName]) {
                    //     $scope.dataset.fe_filters.oneToOneOverrideWithValuesByTitleByFieldName[$scope.finalizedFieldName] =
                    //         $scope.dataset.fe_filters.oneToOneOverrideWithValuesByTitleByFieldName[$scope.finalizedFieldName].filter(function (elem) {
                    //             return elem.value != '' || elem.override != '';
                    //         });
                    //     if ($scope.dataset.fe_filters.oneToOneOverrideWithValuesByTitleByFieldName[$scope.finalizedFieldName].length == 0)
                    //         delete $scope.dataset.fe_filters.oneToOneOverrideWithValuesByTitleByFieldName[$scope.finalizedFieldName];
                    // }

                    // $scope.dataset.fe_filters.keywords = $scope.dataset.fe_filters.keywords.filter(function (elem) {
                    //     return elem.title != $scope.finalizedFieldName;
                    // });
                    // if ($scope.data.keywords.choices.length > 0) $scope.dataset.fe_filters.keywords = $scope.dataset.fe_filters.keywords.concat($scope.data.keywords);

                    // Nested

                    $mdDialog.hide($scope.dataset);
                };
            }







        }
    ]);