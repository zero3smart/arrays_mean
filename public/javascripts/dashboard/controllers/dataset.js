angular.module('arraysApp')
    .controller('DatasetCtrl', ['$scope', '$location', '$state', '$rootScope', 'DatasetService', '$q',
        function($scope, $location, $state, $rootScope, DatasetService, $q) {

            $scope.currentStep = $state.current.name;

            //Keep track of state when navigating without breadcrumbs
            $rootScope.$on('$stateChangeStart',
                function(event, toState){
                    $scope.currentStep = toState.name;
                }
            );

            $scope.primaryAction = {
                disabled: true
            };

            $scope.secondaryAction = {
                disabled: true
            };


            /**
             * If firstImport is not set (existing datasets), set it to 0 (already imported)
             * dataset.firstImport = $scope.checkIfFirstImport(dataset.firstImport);
             */
            $scope.checkIfFirstImport = function(firstImportValue) {
                if (typeof firstImportValue == 'undefined') {
                    return 0;
                } else {
                    return firstImportValue;
                }
            };


            /**
             * Tutorial banner messages
             * TODO Ideally this would have methods and a dictionary of messages for easy editing, getting, setting--
             * there may be issues of $scope to resolve that prevent a dictionary and/or methods from updating messages
             */
            $scope.tutorial = {
                show: false, // only show on sample, for now
                message: ''
            };


            $scope.transitionTo = function(step, anchor) {
                $state.transitionTo(step, {id: $scope.dataset._id, '#': anchor}, {
                    reload: true,
                    inherit: false,
                    notify: true
                });
            };


            $scope.navigate = function(step) {
                // Don't open dialog when navigating to process data
                if($scope.remindUserUnsavedChanges) {
                    var dialogPromise = $scope.openUnsavedChangesDialog('Continue Editing');
                    dialogPromise.then(function() {
                        console.log("here");
                        console.log($scope.discardChangesThisView);
                        // Discard changes
                        $scope.discardChangesThisView();
                        $scope.setRemindUserUnsavedChanges(false);
                        $scope.navigateAndSave(step);
                    }, function() {
                        // TODO Labeled "Continue Editing" but should process data
                        // $scope.processData();
                    });
                } else {
                    $scope.navigateAndSave(step);
                }
            };

            $scope.navigateAndSave = function(step) {

                // var errorHandler = function (error) {
                //     $mdToast.show(
                //         $mdToast.simple()
                //             .textContent(error)
                //             .position('top right')
                //             .hideDelay(3000)
                //     );
                // };
                //
                // var done = function() {

                    $scope.currentStep = step;
                    switch (step) {
                    case 'dashboard.dataset.upload':
                        if ($scope.dataset._id) {
                            $location.path('/dashboard/dataset/upload/' + $scope.dataset._id);
                        }
                        break;
                    case 'dashboard.dataset.data':
                        if ($scope.dataset.uid) {
                            $location.path('/dashboard/dataset/data/' + $scope.dataset._id);
                        }
                        break;
                    case 'dashboard.dataset.views':
                        $location.path('/dashboard/dataset/views/' + $scope.dataset._id);
                        break;
                    case 'dashboard.dataset.settings':
                        if ($scope.dataset._id) {
                            $location.path('/dashboard/dataset/settings/' + $scope.dataset._id);
                        }
                        break;
                    case 'dashboard.dataset.process':
                        $location.path('/dashboard/dataset/process/' + $scope.dataset._id);
                        break;
                    }
                // };

                // var queue = [];
                //
                // var finalizedDataset = angular.copy($scope.dataset);
                // delete finalizedDataset.columns;
                // delete finalizedDataset.__v;
                //
                // queue.push(DatasetService.save(finalizedDataset));
                //
                // if ($scope.additionalDatasources) {
                //     $scope.additionalDatasources.forEach(function(datasource) {
                //         var finalizedDatasource = angular.copy(datasource);
                //         delete finalizedDatasource.fn_new_rowPrimaryKeyFromRowObject;
                //         delete finalizedDatasource.raw_rowObjects_coercionScheme;
                //         delete finalizedDatasource._otherSources;
                //         delete finalizedDatasource._team;
                //         delete finalizedDatasource.title;
                //         delete finalizedDatasource.__v;
                //         delete finalizedDatasource.importRevision;
                //         delete finalizedDatasource.author;
                //         delete finalizedDatasource.updatedBy;
                //         delete finalizedDatasource.brandColor;
                //         delete finalizedDatasource.customFieldsToProcess;
                //         delete finalizedDatasource.urls;
                //         delete finalizedDatasource.description;
                //         delete finalizedDatasource.objectTitle;
                //         delete finalizedDatasource.fe_excludeFields;
                //         delete finalizedDatasource.fe_displayTitleOverrides;
                //         delete finalizedDatasource.fe_fieldDisplayOrder;
                //         delete finalizedDatasource.imageScraping;
                //         delete finalizedDatasource.isPublic;
                //         delete finalizedDatasource.fe_views;
                //         delete finalizedDatasource.fe_filters;
                //         delete finalizedDatasource.fe_objectShow_customHTMLOverrideFnsByColumnNames;
                //
                //         queue.push(DatasetService.save(finalizedDatasource));
                //     });
                // }

                // $q.all(queue)
                //     .then(done)
                //     .catch(errorHandler);
            };

            $scope.processData = function() {
                $scope.navigate('dashboard.dataset.process');
            };

            $scope.convertToURLSafe = function(input) {
                return input.replace(/\.[^/.]+$/, '').toLowerCase().replace(/[^A-Z0-9]+/ig, '_');
            };

        }]);
