angular.module('arraysApp')
    .controller('DatasetDoneCtrl', ['$scope', '$mdToast', 'dataset', 'additionalDatasources', 'DatasetService', '$location', '$q',
        function($scope, $mdToast, dataset, additionalDatasources, DatasetService, $location, $q) {

            $scope.$parent.$parent.dataset = dataset;
            $scope.additionalDatasources = additionalDatasources;
            $scope.$parent.$parent.currentNavItem = 'Done';
            $scope.importLogger = [];
            $scope.inProgress = false;

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
                var isPublised = $scope.$parent.$parent.dataset.isPublished;
                DatasetService.publish($scope.$parent.$parent.dataset._id, isPublised)
            };

            function errorHandler(error) {
                $scope.importLogger.push("❌ Import failed due to " + error);

                $scope.inProgress = false;
            }

            function preImport(uid) {
                $scope.importLogger.push("🔁 [" + uid + "] Importing ...");

                DatasetService.preImport(uid)
                    .then(function (uid) {
                        $scope.importLogger.push("📡 [" + uid + "] Successfully pre-imported!");

                        postImport(uid);

                    }, errorHandler);
            }

            function postImport(uid) {
                $scope.importLogger.push("🔁 [" + uid + "] Finalizing to import ...");

                DatasetService.postImport(uid)
                    .then(function (dataset) {
                        $scope.importLogger.push("📡 [" + uid + "] Successfully finalized!");

                        if (datasourceIndex == -1) {
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

                    }, errorHandler);
            }

            function initializeToImport(uid) {
                $scope.importLogger.push("🔁 [" + uid + "] Initializing to import ...");

                DatasetService.initializeToImport(uid)
                    .then(function (uid) {
                        $scope.importLogger.push("📡 [" + uid + "] Successfully initialized to import!");

                        preImport(uid);

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
                if ($scope.additionalDatasources.length == 0) {
                    if (datasource.dirty == 1)
                        postImport(uid);
                    else if (datasource.dirty > 1)
                        initializeToImport(uid);
                } else {
                    // Re-import all the datasets!
                    // TODO: For additional datasource, we need to remove only the responding results, not the whole set.
                    if (!datasource.dataset_uid)
                        initializeToImport(uid);
                    else
                        preImport(uid);

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