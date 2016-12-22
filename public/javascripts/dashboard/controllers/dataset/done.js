angular.module('arraysApp')
    .controller('DatasetDoneCtrl', ['$scope', '$mdToast', 'dataset', 'additionalDatasources', 'DatasetService', '$location', '$q',
        function($scope, $mdToast, dataset, additionalDatasources, DatasetService, $location, $q) {

            $scope.$parent.$parent.dataset = dataset;
            $scope.additionalDatasources = additionalDatasources;
            $scope.$parent.$parent.currentNavItem = 'Done';
            $scope.importLogger = [];
            $scope.inProgress = false;

            $scope.usedInMerging = [];
            DatasetService.getDatasetsWithQuery({_otherSources: dataset._id})
            .then(function(datasets) {
                $scope.additionalDatasources = $scope.additionalDatasources.concat(datasets);
            })


            $scope.subdomain = $location.protocol() +  "://" + $scope.team.subdomain  + "."+ $location.host() + ":" + $location.port();

            refreshForm();


            function refreshForm() {
                $scope.dirty = $scope.$parent.$parent.dataset.dirty;
                $scope.imported = $scope.$parent.$parent.dataset.imported;
                $scope.additionalDatasources.forEach(function(datasource) {
                    $scope.dirty = $scope.dirty || datasource.dirty;
                    $scope.imported = $scope.imported && datasource.imported;
                });
            }

            var datasourceIndex = -1;

            $scope.togglePublish = function() {
                var isPublic = $scope.$parent.$parent.dataset.isPublic;
                DatasetService.publish($scope.$parent.$parent.dataset._id, isPublic)
            };

            function errorHandler(response) {

                var error = response.data.error;
                $scope.importLogger.push("❌ Import failed due to " + error);

                $scope.inProgress = false;
            }

            function preImport(id,uid) {
                $scope.importLogger.push("🔁 [" + uid + "] Importing raw objects ...");

                DatasetService.preImport(id)
                    .then(function (response) {
                        if (response.status == 200 && !response.data.error) {
                            $scope.importLogger.push("📡 [" + uid + "] Successfully imported raw objects!");
                            importProcess(id,uid);
                        } else {
                            errorHandler(response);
                        }
                    }, errorHandler);
            }

            function importProcess(id,uid) {
                $scope.importLogger.push("🔁 [" + uid + "] Importing processed row objects ...");
                DatasetService.importProcessed(id)
                    .then(function (response) {
                        if (response.status == 200 && !response.data.error) {
                            $scope.importLogger.push("📡 [" + uid + "] Successfully imported processed objects!");
                            postImport(id,uid);
                        } else {
                            errorHandler(response);
                        }
                    }, errorHandler);

            }

            function postImport(id,uid) {
                $scope.importLogger.push("🔁 [" + uid + "] Generating post import filter caching....");

                DatasetService.postImport(id)
                    .then(function (response) {

                        if (response.status == 200) {


                            var dataset = response.data.dataset;
            
                            $scope.importLogger.push("📡 [" + uid + "] Successfully cached all the filters!");

                            if (datasourceIndex == -1) {
                                if (!dataset.fe_designatedFields) {
                                    dataset.fe_designatedFields = {};
                                }

                                $scope.$parent.$parent.dataset = dataset;
                            } else {
                                $scope.additionalDatasources[datasourceIndex] = dataset;
                            }
                            datasourceIndex ++;
                            if (datasourceIndex < $scope.additionalDatasources.length) {
                                importDatasource($scope.additionalDatasources[datasourceIndex]);
                            } else {
                                allDone();
                            }

                        } else {
                            errorHandler(response);
                        }

                    }, errorHandler);
            }

            function initializeToImport(id,uid) {
                $scope.importLogger.push("🔁 [" + uid + "] Initializing to import ...");

                DatasetService.initializeToImport(id)
                    .then(function (response) {

                        if (response.status == 200) {
                            $scope.importLogger.push("📡 [" + uid + "] Successfully initialized to import!");
                            preImport(id,uid);

                        } else {
                            errorHandler(response);
                        }

                    }, errorHandler);
            }

            function allDone() {
                $scope.importLogger.push("📡 All done!");
                $scope.inProgress = false;

                refreshForm();

                $mdToast.show(
                    $mdToast.simple()
                        .textContent('Dataset imported successfully!')
                        .position('top right')
                        .hideDelay(3000)
                );
            }

            function importDatasource(datasource) {


                var uid = datasource.dataset_uid ? datasource.dataset_uid : datasource.uid;
                var id = datasource._id;
                if ($scope.additionalDatasources.length == 0) {
                    if (datasource.dirty == 1)
                        postImport(id,uid);
                    else if (datasource.dirty > 1)
                        initializeToImport(id,uid);
                } else {
                    // Re-import all the datasets!
                    // TODO: For additional datasource, we need to remove only the responding results, not the whole set.
                    if (!datasource.dataset_uid)
                        initializeToImport(id,uid);
                    else
                        preImport(id,uid);

                    /*
                     datasourceIndex++;
                     if (datasourceIndex < $scope.additionalDatasources.length) {
                     importDatasource($scope.additionalDatasources[datasourceIndex]);
                     } else {
                     allDone();
                     }
                     */
                }

            }

            $scope.importData = function() {
                datasourceIndex = -1;
                $scope.inProgress = true;

                importDatasource($scope.$parent.$parent.dataset);
            }
        }
    ]);