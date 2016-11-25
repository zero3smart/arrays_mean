angular.module('arraysApp')
    .controller('DatasetDoneCtrl', ['$scope', '$mdToast', 'dataset', 'DatasetService',
        function($scope, $mdToast, dataset, DatasetService) {

            $scope.$parent.$parent.dataset = dataset;
            $scope.$parent.$parent.currentNavItem = 'Done';
            $scope.inProgress = false;

            function preImport(uid) {
                DatasetService.preImport(uid)
                    .then(function (uid) {
                        $mdToast.show(
                            $mdToast.simple()
                                .textContent('Dataset pre-imported successfully!')
                                .position('top right')
                                .hideDelay(3000)
                        );

                        postImport(uid);

                    }, function(error) {
                        $scope.inProgress = false;
                        $mdToast.show(
                            $mdToast.simple()
                                .textContent('Pre-Import failed due to : ' + error)
                                .position('top right')
                                .hideDelay(5000)
                        );
                    });
            }

            function postImport(uid) {
                DatasetService.postImport(uid)
                    .then(function (dataset) {
                        $mdToast.show(
                            $mdToast.simple()
                                .textContent('Dataset imported successfully!')
                                .position('top right')
                                .hideDelay(3000)
                        );

                        $scope.inProgress = false;
                        $scope.$parent.$parent.dataset = dataset;

                    }, function(error) {
                        $scope.inProgress = false;
                        $mdToast.show(
                            $mdToast.simple()
                                .textContent('Pre-Import failed due to : ' + error)
                                .position('top right')
                                .hideDelay(5000)
                        );
                    });
            }

            function initializeToImport(uid) {
                DatasetService.initializeToImport(uid)
                    .then(function (uid) {
                        $mdToast.show(
                            $mdToast.simple()
                                .textContent('Dataset initialized to import successfully!')
                                .position('top right')
                                .hideDelay(3000)
                        );

                        preImport(uid);

                    }, function (error) {
                        $scope.inProgress = false;
                        $mdToast.show(
                            $mdToast.simple()
                                .textContent('Intialization failed due to : ' + error)
                                .position('top right')
                                .hideDelay(5000)
                        );
                    });
            }

            $scope.importData = function() {
                var uid = dataset.dataset_uid ? dataset.dataset_uid : dataset.uid;
                $scope.inProgress = true;

                initializeToImport(uid);
            }
        }
    ]);