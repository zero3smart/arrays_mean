angular.module('arraysApp')
    .controller('DatasetDoneCtrl', ['$scope', '$mdToast', 'dataset', 'additionalDatasources', 'DatasetService', '$location', '$q','Job','$timeout',
        function($scope, $mdToast, dataset, additionalDatasources, DatasetService, $location, $q,Job,$timeout) {


            //-- helper functions ---//

            function errorHandler(response) {

                var error = response.data.error;
                $scope.importLogger.push("❌ Import failed due to " + error);

                $scope.inProgress = false;
            }


            function getJobAndLog (datasetId) {

    
                if (!$scope.jobs[$scope.jobs.length-1].state || $scope.jobs[$scope.jobs.length-1].state == 'active' ||
                    $scope.jobs[$scope.jobs.length-1].state == 'in active') {
        
                    Job.get({id:$scope.currentJobId}).$promise.then(function(job) {

                        job.log = $scope.jobs[$scope.jobs.length -1].log;

                        $scope.jobs[$scope.jobs.length -1] = job;

                        Job.getLog({id:$scope.currentJobId}).$promise
                        .then(function(logs) {
                            $scope.jobs[$scope.jobs.length -1].log = logs[logs.length-1];

                            $timeout(function() {
                                getJobAndLog(datasetId);
                            },2000);
                        })
                    })
                   
                } else if ($scope.jobs[$scope.jobs.length-1].state == 'complete'){
  
                    
                    getJobStatus(datasetId);
                  
                }
               
            }


            function preImport(id) {
                DatasetService.preImport(id)
                    .then(function (response) {

                        if (response.status == 200 && !response.data.error) {

                            $timeout(function() {
                                getJobStatus(id)
                            }, 2000);

                        } else {
                            errorHandler(response);
                        }
                    }, errorHandler);
            }




            function refreshForm() {
                $scope.dirty = 0;
                $scope.imported = true;
            }



            function getJobStatus (datasetId) {
                DatasetService.getJobStatus(datasetId)
                .then(function(job) { 

                    if (job.id == 0) {

                       lastStep();
        
                    } else {

                        if (typeof $scope.currentJobId == 'undefined' || $scope.currentJobId !== job.id) {
                            $scope.currentJobId = job.id;
                            $scope.jobs.push({});
                        }

                        getJobAndLog(datasetId);
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

                    if ($scope.dirty == 3) {

                        postImport($scope.additionalDatasources[datasourceIndex]._id);

                    } else {

                        getJobStatus($scope.additionalDatasources[datasourceIndex]._id);

                    }
                    
                    
                } else {
                    allDone();
                }


            }

           

            function importProcess(id) {

                DatasetService.importProcessed(id)
                    .then(function (response) {
                        if (response.status == 200 && !response.data.error) {

                           $timeout(function() {
                                getJobStatus(id)
                            }, 2000);

                        } else {
                            errorHandler(response);
                        }
                    }, errorHandler);
            }

            function scrapeImages(id) { 

                DatasetService.scrapeImages(id)
                .then(function (response) {
                    if (response.status == 200 && !response.data.error) {
                        
                        $timeout(function() {
                            getJobStatus(id)
                        }, 2000);


                    } else {

                        errorHandler(response);
                        
                    }
                }, errorHandler);
            
            }


            function postImport(id) {
               

                if ($scope.additionalDatasources.length == 0 || datasourceIndex !== -1) {

                    DatasetService.postImport(id)

                        .then(function (response) {
                            if (response.status == 200 && !response.data.error) {

                                $timeout(function() {
                                    getJobStatus(id)
                                }, 2000);
                                
                            } else {
                                errorHandler(response);
                            }

                        }, errorHandler);

                } else {
                    lastStep();

                }
            }

            function allDone() {
                
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

                var id = datasource._id;

                if ($scope.additionalDatasources.length == 0) {



                    if (datasource.dirty == 1) {
                        preImport(id);
                    } else if (datasource.dirty == 2) {
                        importProcess(id);
                    } else if (datasource.dirty == 3) {
                        postImport(id);
                    } else if (datasource.dirty == 4) {
                        scrapeImages(id);
                    }

                } else {

                 
                    if ($scope.dirty == 1) {
                        preImport(id);
                    } else if ($scope.dirty == 2) {
                        importProcess(id);
                    } else if ($scope.dirty == 3) {
                        postImport(id);
                    } else if ($scope.dirty == 4) {
                        scrapeImages(id);
                    }

                }

            }
            // -- end helper functions --- //



            if (dataset.jobId !== 0) {
                $scope.inProgress = true; 
            
                getJobStatus(dataset._id);
               
            } else {
                 $scope.inProgress = false;
            }



            $scope.$parent.$parent.dataset = dataset;
            $scope.additionalDatasources = additionalDatasources;
            $scope.$parent.$parent.currentNavItem = 'Done';
            $scope.importLogger = [];
            $scope.datasetsToProcess = [];

            $scope.datasetsToProcess[$scope.$parent.$parent.dataset._id] = {uid: $scope.$parent.$parent.dataset.uid};


            $scope.jobs = [];
            $scope.currentJobId = undefined;

            DatasetService.getReimportDatasets(dataset._id)
            .then(function(datasets) {

                $scope.additionalDatasources = $scope.additionalDatasources.concat(datasets);

                $scope.additionalDatasources.map(function(ds) {
                    if (ds.dataset_uid) {
                         $scope.datasetsToProcess[ds._id] = {uid: ds.dataset_uid};
                    } else {
                         $scope.datasetsToProcess[ds._id] = {uid: ds.uid};
                    }
                })


            })

            
            

           
            $scope.dirty = $scope.$parent.$parent.dataset.dirty;

            $scope.imported = $scope.$parent.$parent.dataset.imported;




            $scope.additionalDatasources.forEach(function(datasource) {

                if (datasource.dirty !== 0 && datasource.dirty < $scope.dirty) {
                    $scope.dirty = datasource.dirty;
                } 
                $scope.imported = $scope.imported && datasource.imported;

                if (dataset.jobId == 0 && datasource.jobId !== 0) {

                    $scope.inProgress = true; 
                    getJobStatus(datasource._id);
                    return false;
                }
                
            });



            $scope.subdomain = $location.protocol() +  "://" + $scope.team.subdomain  + "."+ $location.host() + ":" + $location.port();



           


            var datasourceIndex = -1;

            $scope.togglePublish = function() {
                var isPublic = $scope.$parent.$parent.dataset.isPublic;
                DatasetService.publish($scope.$parent.$parent.dataset._id, isPublic)
            };


            $scope.toggleImageScraping = function() {
                var skip = $scope.$parent.$parent.dataset.skipImageScraping;
                DatasetService.skipImageScraping($scope.$parent.$parent.dataset._id,skip);
            }
            

            $scope.importData = function() {
                // datasourceIndex = -1;
                $scope.inProgress = true;
                importDatasource($scope.$parent.$parent.dataset);
            }
        }
    ]);