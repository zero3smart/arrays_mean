angular.module('arraysApp')
    .controller('DatasetDoneCtrl', ['$scope', '$mdToast', 'dataset', 'DatasetService',
        function($scope, $mdToast, dataset, DatasetService) {

            $scope.$parent.$parent.dataset = dataset;
            $scope.$parent.$parent.currentNavItem = 'Done';
            $scope.importLogger = [];
            $scope.inProgress = false;

            function preImport(uid) {
                $scope.importLogger.push("🔁 Importing ...");

                DatasetService.preImport(uid)
                    .then(function (uid) {
                        $scope.importLogger.push("📡 Successfully imported!");

                        postImport(uid);

                    }, function(error) {
                        $scope.importLogger.push("❌ Import failed due to " + error);

                        $scope.inProgress = false;
                    });
            }

            function postImport(uid) {
                $scope.importLogger.push("🔁 Finalizing to import...");

                DatasetService.postImport(uid)
                    .then(function (dataset) {
                        $scope.importLogger.push("📡 Successfully imported! All done!");

                        $mdToast.show(
                            $mdToast.simple()
                                .textContent('Dataset imported successfully!')
                                .position('top right')
                                .hideDelay(3000)
                        );

                        $scope.inProgress = false;
                        $scope.$parent.$parent.dataset = dataset;

                    }, function(error) {
                        $scope.importLogger.push("❌ Finalization failed due to " + error);

                        $scope.inProgress = false;
                    });
            }

            function initializeToImport(uid) {
                $scope.importLogger.push("🔁 Initializing to import ...");

                DatasetService.initializeToImport(uid)
                    .then(function (uid) {
                        $scope.importLogger.push("📡 Successfully initialized to import!");

                        preImport(uid);

                    }, function (error) {
                        $scope.inProgress = false;

                        $scope.importLogger.push("❌ Initialization failed due to " + error);
                    });
            }

            $scope.importData = function() {
                var uid = dataset.dataset_uid ? dataset.dataset_uid : dataset.uid;
                $scope.inProgress = true;

                if (dataset.dirty == 1)
                    postImport(uid)
                else
                    initializeToImport(uid);
            }
        }
    ]);