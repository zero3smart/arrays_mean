angular.module('arraysApp')
    .controller('DatasetDoneCtrl', ['$scope', '$mdToast', 'dataset', 'additionalDatasources', 'DatasetService', '$location', '$q','Job','$timeout',
        function($scope, $mdToast, dataset, additionalDatasources, DatasetService, $location, $q,Job,$timeout) {

            $scope.$parent.$parent.dataset = dataset;
            $scope.additionalDatasources = additionalDatasources;
            $scope.$parent.$parent.currentNavItem = 'Done';
            $scope.importLogger = [];
            $scope.inProgress = false;

            $scope.jobs = {};
            $scope.currentStep = 0;

            $scope.currentJobId = undefined;

            DatasetService.getReimportDatasets(dataset._id)
            .then(function(datasets) {
                $scope.additionalDatasources = $scope.additionalDatasources.concat(datasets);

            })

            $scope.dirty = $scope.$parent.$parent.dataset.dirty;

            $scope.imported = $scope.$parent.$parent.dataset.imported;


            $scope.additionalDatasources.forEach(function(datasource) {

                if (datasource.dirty !== 0 && datasource.dirty < $scope.dirty) {
                    $scope.dirty == datasource.dirty;
                } 

                $scope.imported = $scope.imported && datasource.imported;
                
            });



            $scope.subdomain = $location.protocol() +  "://" + $scope.team.subdomain  + "."+ $location.host() + ":" + $location.port();



            function refreshForm() {
                $scope.dirty = 0;
                $scope.imported = true;
            }


            var datasourceIndex = -1;

            $scope.togglePublish = function() {
                var isPublic = $scope.$parent.$parent.dataset.isPublic;
                DatasetService.publish($scope.$parent.$parent.dataset._id, isPublic)
            };


            $scope.toggleImageScraping = function() {
                var skip = $scope.$parent.$parent.dataset.skipImageScraping;
                DatasetService.skipImageScraping($scope.$parent.$parent.dataset._id,skip);
            }

            function errorHandler(response) {

                var error = response.data.error;
                $scope.importLogger.push("❌ Import failed due to " + error);

                $scope.inProgress = false;
            }

            function preImport(id,uid) {
                DatasetService.preImport(id)
                    .then(function (response) {

                        if (response.status == 200 && !response.data.error) {
                           
                            var jobId = response.data.jobId;
                            $scope.importLogger.push("🔁  [" + uid + "] Importing raw objects ...");
                            $scope.currentJobId = jobId;
                            $scope.jobs[jobId] = {};
                            $scope.currentStep = 1;

                            $timeout(function() {
                                getJobStatus(id,uid)
                            }, 2000);
                        } else {
                            errorHandler(response);
                        }
                    }, errorHandler);
            }

            var getJobStatus = function (id,uid) {

                Job.get({id:$scope.currentJobId}).$promise
                .then(function(job) {

                    // console.log(job);

                    $scope.jobs[$scope.currentJobId].state = job.state;

                    if (job.state == 'active') {
                        Job.getLog({id:$scope.currentJobId}).$promise
                        .then(function(logs) {
                            $scope.jobs[$scope.currentJobId].log = logs[logs.length-1];
                        })

                         $timeout(function() {
                            getJobStatus(id,uid)
                        }, 4000);

                    } else if (job.state == 'failed') {
                        $scope.importLogger.push(" ❌  [" + uid + "] Error: " + job.error);


                    } else {
                        if ($scope.currentStep == 1) {
                            $scope.importLogger.push("📡 [" + uid + "] Successfully imported raw objects!");
                            importProcess(id,uid);

                        } else if ($scope.currentStep == 2) {
                            $scope.importLogger.push("📡  [" + uid + "] Successfully imported processed objects!")
                            postImport(id,uid);

                        } else if ($scope.currentStep == 3) {
                            $scope.importLogger.push("📡  [" + uid + "] Successfully cached all the filters for the views! ");

                            if (dataset.skipImageScraping) {
                                lastStep();
                            } else {
                                scrapeImages(id,uid);
                            }

                        } else if ($scope.currentStep == 4) {

                            $scope.importLogger.push("📡  [" + uid + "] Successfully scraped all the images! ");

                            lastStep();

                        }
                    }


                })
            }

            function lastStep() {

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


            }

        

            function importProcess(id,uid) {

                DatasetService.importProcessed(id)
                    .then(function (response) {
                        if (response.status == 200 && !response.data.error) {

                            var jobId = response.data.jobId;

                            $scope.importLogger.push("🔁  [" + uid + "] Importing processed row objects ...");
                            $scope.currentJobId = jobId;
                            $scope.jobs[jobId] = {};
                            $scope.currentStep = 2;

                            $timeout(function() {
                                getJobStatus(id,uid)
                            },2000);

                        } else {
                            errorHandler(response);
                        }
                    }, errorHandler);
            }

            function scrapeImages(id,uid) { 

                DatasetService.scrapeImages(id)
                .then(function (response) {
                    if (response.status == 200 && !response.data.error) {
                        var jobId = response.data.jobId;

                        $scope.importLogger.push("🔁  [" + uid + "] Initiating image scraping ...");
                        $scope.currentJobId = jobId;
                        $scope.jobs[jobId] = {};


                    } else {
                        errorHandler(response);
                    }
                }, errorHandler);
            
                $scope.currentStep = 4;

                $timeout(function() {
                    getJobStatus(id,uid)
                },2000);
            }


            function postImport(id,uid) {
               
                DatasetService.postImport(id)
                    .then(function (response) {

                        if (response.status == 200 && !response.data.error) {

                            var jobId = response.data.jobId;

                            $scope.importLogger.push("🔁  [" + uid + "] Generating post import filter caching....");
                            $scope.currentJobId = jobId;
                            $scope.jobs[jobId] = {};
                            $scope.currentStep = 3;

                            $timeout(function() {
                                getJobStatus(id,uid)
                            },2000);
                            
                        } else {
                            errorHandler(response);
                        }

                    }, errorHandler);
            }

            function allDone() {
                $scope.importLogger.push("📡  All done!");
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

                    if (datasource.dirty == 1) {
                        preImport(id,uid);
                    } else if (datasource.dirty == 2) {
                        importProcess(id,uid);
                    } else if (datasource.dirty == 3) {
                        postImport(id,uid);
                    }
                } else {
                     if ($scope.dirty == 1) {
                        preImport(id,uid);
                    } else if ($scope.dirty == 2) {
                        importProcess(id,uid);
                    } else if ($scope.dirty == 3) {
                        postImport(id,uid);
                    }

                }

            }

            $scope.importData = function() {
                datasourceIndex = -1;
                $scope.inProgress = true;
                importDatasource($scope.$parent.$parent.dataset);
            }
        }
    ]);