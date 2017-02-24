angular.module('arraysApp')
    .controller('DatasetCtrl', ['$scope', '$location', '$state', '$rootScope','DatasetService','$q',
        function($scope, $location, $state, $rootScope,DatasetService,$q) {

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

            $scope.navigate = function(step, anchor) {
                var errorHandler = function (error) {
                        $mdToast.show(
                        $mdToast.simple()
                            .textContent(error)
                            .position('top right')
                            .hideDelay(5000)
                    );
                }

                var done = function() {

                    $scope.currentStep = step;
                    switch (step) {
                    case 'dashboard.dataset.settings':
                        if ($scope.dataset._id) {
                            $location.hash(anchor || '');
                            $location.path('/dashboard/dataset/settings/' + $scope.dataset._id);
                        }
                        break;
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
                    case 'dashboard.dataset.done':
                        if ( ($scope.dataset.fe_listed && $scope.dataset.fe_visible && $scope.dataset.fe_views.default_view )|| (!$scope.dataset.fe_listed && !$scope.dataset.fe_visible) ) {
                            $location.path('/dashboard/dataset/done/' + $scope.dataset._id);
                        }
                        break;
                    }
                }



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




                   }



                    $q.all(queue)
                        .then(done)
                        .catch(errorHandler);


            };

            $scope.convertToURLSafe = function(input) {
                return input.replace(/\.[^/.]+$/, '').toLowerCase().replace(/[^A-Z0-9]+/ig, '_');
            };

        }]);
