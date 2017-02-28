angular.module('arraysApp')
    .controller('DatasetCtrl', ['$scope', '$location', '$state', '$rootScope','DatasetService','$q',
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


            $scope.transitionTo = function(step,anchor) {
                $state.transitionTo(step, {id: $scope.dataset._id, '#': anchor}, {
                    reload: true,
                    inherit: false,
                    notify: true
                });
            }

            $scope.navigate = function(step) {

                var errorHandler = function (error) {
                    $mdToast.show(
                        $mdToast.simple()
                            .textContent(error)
                            .position('top right')
                            .hideDelay(5000)
                    );
                };

                var done = function() {

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
                            $location.hash('');
                            $location.path('/dashboard/dataset/settings/' + $scope.dataset._id);
                        }
                        break;
                    case 'dashboard.dataset.done':
                        /** removing if statement--should not be an issue--
                         *  this is only called from processData(),
                         *  which only appears after dataset is imported
                         */
                        // if ( ($scope.dataset.fe_listed && $scope.dataset.fe_visible && $scope.dataset.fe_views.default_view )|| (!$scope.dataset.fe_listed && !$scope.dataset.fe_visible) ) {
                        $location.path('/dashboard/dataset/done/' + $scope.dataset._id);
                        // }
                        break;
                    }
                };

                var queue = [];

                    var finalizedDataset = angular.copy($scope.dataset);
                    delete finalizedDataset.columns;
                    delete finalizedDataset.__v;

                    queue.push(DatasetService.save(finalizedDataset));

                   if ($scope.additionalDatasources) {

                        $scope.additionalDatasources.forEach(function(datasource) {
                            var finalizedDatasource = angular.copy(datasource);
                            delete finalizedDatasource.fn_new_rowPrimaryKeyFromRowObject;
                            delete finalizedDatasource.raw_rowObjects_coercionScheme;
                            delete finalizedDatasource._otherSources;
                            delete finalizedDatasource._team;
                            delete finalizedDatasource.title;
                            delete finalizedDatasource.__v;
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
                            delete finalizedDatasource.imageScraping;
                            delete finalizedDatasource.isPublic;
                            delete finalizedDatasource.fe_views;
                            delete finalizedDatasource.fe_filters;
                            delete finalizedDatasource.fe_objectShow_customHTMLOverrideFnsByColumnNames;



                            queue.push(DatasetService.save(finalizedDatasource));
                        });

                   }

                    $q.all(queue)
                        .then(done)
                        .catch(errorHandler);
            };

            $scope.processData = function() {
                $scope.navigate('dashboard.dataset.done');
            };

            // $scope.revert = function() {
            //     function getOldData() {
            //         var deferred = $q.defer();
            //         DatasetService.get($scope.dataset._id)
            //         .then(function(data) {
            //             if (data.jobId !== 0) {
            //                 deferred.reject({importing: true, datasetId: data._id});
            //             } else {
            //                 deferred.resolve(data);
            //             }
            //         });
            //         return deferred.promise;
            //     }
            //
            //     var oldDataPromise = getOldData();
            //     oldDataPromise.then(function(dataset) {
            //         $scope.dataset = angular.copy(dataset);
            //         $scope.dataset.dirty = 0;
            //
            //         // apply the same resets as in data.js reset()
            //         if (!dataset.columns) return;
            //
            //         $scope.data = {};
            //         $scope.coercionScheme = angular.copy(dataset.raw_rowObjects_coercionScheme);
            //         $scope.data.fe_designatedFields = dataset.fe_designatedFields;
            //
            //         // reload so each view's resets are applied
            //         // $state.reload();
            //         $scope.navigate($scope.currentStep); // will save dirty = 0
            //     }, function(err) {
            //         // console.log(err)
            //     });
            // };

            $scope.convertToURLSafe = function(input) {
                return input.replace(/\.[^/.]+$/, '').toLowerCase().replace(/[^A-Z0-9]+/ig, '_');
            };

        }]);
