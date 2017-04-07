angular.module('arraysApp')
    .controller('DatasetUploadCtrl', ['$scope', 'dataset', 'additionalDatasources', 'FileUploader', '$mdToast', '$mdDialog', '$state', 'AuthService', 'DatasetService', '$window', 'viewUrlService',
        function ($scope, dataset, additionalDatasources, FileUploader, $mdToast, $mdDialog, $state, AuthService, DatasetService, $window, viewUrlService) {

            $scope.$parent.$parent.dataset = dataset;

            $scope.$parent.$parent.currentNavItem = 'upload';
            $scope.progressMode = 'determinate';
            $scope.newDatasource = false;

            $scope.$parent.$parent.discardChangesThisView = angular.noop;
            $scope.setRemindUserUnsavedChanges(false);

            /** if not enterprise, skip option links (only one choice of CSV)
             *  and go straight to CSV upload
             *  until database is a public option and JSON is supported
             *  ['csv', 'json', 'database']
             */
            // $scope.addingSourceType = ($scope.env.node_env == 'enterprise') ? '' : 'csv';
            $scope.addingSourceType = '';
            $scope.connectAction = {};
            $scope.connection = {};


            $scope.tables = undefined;
            if ($scope.$parent.$parent.dataset.connection && $scope.$parent.$parent.dataset.connection.tableName) {
                $scope.tables = $scope.$parent.$parent.dataset.tables;
            }

            $scope.resetAdditionalSource = function(additonalSrc) {
                if (!dataset.connection) {
                    additonalSrc.uploader.removeAndReset(additonalSrc.uploader.queue[0]);
                } else {
                    additonalSrc.setSourceType("");
                    delete dataset.connection;
                }
            }


            $scope.addSourceType = function(type) {
                if (type == 'database' && $scope.env.node_env == 'enterprise') {
                    if (!$scope.connection) $scope.connection = {};
                    $scope.connection.type = 'hadoop';
                    $scope.addingSourceType = 'database';
                } else if (type == 'csv') {
                    $scope.addingSourceType = 'csv';
                    $scope.connection = {};
                } else {
                    $scope.addingSourceType = '';
                    $scope.connection = {};
                }

                return $scope.addingSourceType;
            };



            $scope.addingAdditionalDatasource = false; // this can become addingAdditionalSourceType

            dataset.firstImport = $scope.checkIfFirstImport(dataset.firstImport);

            $scope.primaryAction.text = dataset.firstImport ? 'Next' : 'View';

            $scope.$watch('dataset.fileName', function(hasFile) {
                $scope.primaryAction.disabled = !(hasFile && hasFile !== null);
            });

            $scope.$watch('connection.connected',function(connected) {
                if (connected == true) {
                    $scope.connectAction.text = "Save";
                } else $scope.connectAction.text = "Connect";
            })

            $scope.tutorial.message = 'Here you can add your data source.\nIn this example, a spreadsheet has already been uploaded.';

            $scope.$watch('dataset.connection.tableName', function(hasTable) {
                if (!dataset.fileName) {
                    $scope.primaryAction.disabled = !(hasTable && hasTable !== null && $scope.isConnecting !== true);
                }
            });




            var _save = function() {



                if (dataset.firstImport == 1) dataset.firstImport = 2;

                var finalizedDataset = angular.copy(dataset);
                delete finalizedDataset.columns;
                delete finalizedDataset.__v;


                DatasetService.save(finalizedDataset)
                    .then(function() {
                        $state.transitionTo('dashboard.dataset.data', {id: dataset._id}, {
                            reload: true,
                            inherit: false,
                            notify: true
                        });
                    });
            };

            var _viewViz = function() {
                var url = ($scope.team.isEnterprise) ? viewUrlService.getViewUrl($scope.subdomain, dataset, null, false) :
                viewUrlService.getViewUrl($scope.subdomain, dataset, dataset.fe_views.default_view, false);

                $window.open(url, '_blank');
            };

            $scope.primaryAction.do = dataset.firstImport ? _save : _viewViz;

            $scope.additionalDatasources = additionalDatasources.map(function(additionalDatasource) {
                return initSource(additionalDatasource);
            });

            if (dataset.connection && dataset.fileName) {


                $scope.additionalDatasources.push({});

                $scope.additionalDatasources[0].sourceType = 'database';
                // $scope.additionalDatasources[0].uploader.isUploading = true;
            }

            $scope.saveConnection = function(datasource,additional) {

                 if (!$scope.connection.url || !$scope.connection.type || $scope.connection.url.indexOf('://') == -1 ||
                    !$scope.connection.tableName) {
                    $mdToast.show(
                            $mdToast.simple()
                                .textContent('Please make sure you have fill in all information')
                                .position('top right')
                                .hideDelay(3000)
                        );
                    return;

                }

                var finalizedDataset = angular.copy(datasource);
                finalizedDataset.connection = $scope.connection;
                if (additional) finalizedDataset.schema_id = dataset._id;
                delete finalizedDataset.connection.connected;
                delete finalizedDataset.columns;
                delete finalizedDataset.__v;

                DatasetService.save(finalizedDataset)
                    .then(function(response) {


                        if (additional) {

                            datasource._id = response.data.id;
                            datasource.connection = $scope.connection;

                        } else {
                            dataset.connection = $scope.connection;
                            $scope.connection = {};
                            $scope.addingSourceType = '';

                        }




                        $mdToast.show(
                            $mdToast.simple()
                                .textContent('Remote datasource connection saved!')
                                .position('top right')
                                .hideDelay(3000)
                        );


                    });

            }


            $scope.connectToDB = function(datasource,add) {
                if ($scope.connectAction.text == "Save") return $scope.saveConnection(datasource,add);


                if (!$scope.connection.url || !$scope.connection.type || $scope.connection.url.indexOf('://') == -1) {
                    $mdToast.show(
                            $mdToast.simple()
                                .textContent('Error in connection settings, please review again')
                                .position('top right')
                                .hideDelay(3000)
                        );
                    return;

                }

                $scope.isConnecting = true;

                DatasetService.connectToRemoteDatasource(datasource._id, $scope.connection)
                    .then(function(response) {


                        if (response.status == 200 && !response.data.error) {
                            $scope.isConnecting = false;
                            $scope.connection.connected = true;
                            $scope.tables = response.data;

                            $mdToast.show(
                            $mdToast.simple()
                                .textContent('Connected to database!')
                                .position('top right')
                                .hideDelay(3000)
                        );
                        } else {
                            $scope.isConnecting = undefined;

                            $mdToast.show(
                            $mdToast.simple()
                                .textContent('Error connecting to database.')
                                .position('top right')
                                .hideDelay(3000)
                        );

                        }

                    });
            };

            $scope.connectAction.do = ($scope.connectAction.text == "Save") ? $scope.saveConnection: $scope.connectToDB;

            function initSource(additionalDatasource) {
                var uploader = new FileUploader({
                    url: '/api/dataset/upload',
                    formData: [{id: dataset._id, child: true}],
                    queueLimit: 1, // Limited for each dataset
                    headers: {
                        'Authorization': 'Bearer ' + AuthService.getToken()
                    }
                });

                uploader.onWhenAddingFileFailed = onWhenAddingFileFailed;

                uploader.onAfterAddingFile = function(item) {

                    if (!additionalDatasource.fileName)
                        additionalDatasource.fileName = item.file.name;
                };

                uploader.onProgressAll = function(progress) {
                    // TODO: Need to calculate the uploading progress into the AWS
                    if (progress == 100) {
                        var self = this;
                        var additionalDatasource = $scope.additionalDatasources.find(function(a) {
                            return a.uploader == self;
                        });
                        additionalDatasource.progressMode = 'indeterminate';
                    }
                };

                uploader.onCompleteItem = function(fileItem, response, status) {
                    var self = this;
                    var additionalDatasource = $scope.additionalDatasources.find(function(a) {
                        return a.uploader == self;
                    });
                    additionalDatasource.progressMode = 'determinate';

                    if (status != 200 || response == '') return;

                    if (!response.error && response.id) {
                        $mdToast.show(
                            $mdToast.simple()
                                .textContent(fileItem.file.name + ' uploaded!')
                                .position('top right')
                                .hideDelay(3000)
                        );

                        additionalDatasource._id = response.id;
                        $scope.addingAdditionalDatasource = false;
                        additionalDatasource.fileName = fileItem.file.name; // force uploaded/uploading list changes
                    } else {
                        $mdToast.show(
                            $mdToast.simple()
                                .textContent(response.error)
                                .position('top right')
                                .hideDelay(3000)
                        );

                        fileItem.isError = true;
                        fileItem.isUploaded = false;
                        fileItem.isSuccess = false;
                    }

                };

                uploader.removeAndReset = function(fileItem) {
                    // $scope.addingAdditionalDatasource = false;
                    if(fileItem) {
                        uploader.removeFromQueue(fileItem);
                    }
                    additionalDatasource.sourceType = '';
                };

                additionalDatasource.sourceType =  ($scope.env.node_env=='enterprise' )? '' : 'csv'; // force csv until JSON is ready
                if (additionalDatasource.connection) additionalDatasource.sourceType = 'database';
                additionalDatasource.setSourceType = function(type) {
                    additionalDatasource.sourceType = type;
                    if (type == 'database') $scope.connection.type = 'hadoop';
                };

                additionalDatasource.uploader = uploader;


                additionalDatasource.progressMode = 'determinate';
                return additionalDatasource;
            }

            $scope.uploader = new FileUploader({
                url: '/api/dataset/upload',
                formData: [{id: dataset._id}],
                queueLimit: 1, // Limited for each dataset
                headers: {
                    'Authorization': 'Bearer ' + AuthService.getToken()
                }

            });

            $scope.uploader.removeAndReset = function(fileItem) {
                if(fileItem) {
                    $scope.uploader.removeFromQueue(fileItem);
                }
                $scope.addingSourceType = '';
            };

            // CALLBACKS

            $scope.uploader.onBeforeUploadItem = function(item) {

                item.formData[0].tempTitle =  dataset.title;

            };

            function onWhenAddingFileFailed(item, filter) {
                // console.info('onWhenAddingFileFailed', item, filter, options);
                if (filter.name == 'queueLimit') {
                    this.clearQueue();
                    this.addToQueue(item);
                }
            }

            $scope.uploader.onWhenAddingFileFailed = onWhenAddingFileFailed;

            $scope.uploader.onProgressAll = function(progress) {
                // TODO: Need to calculate the uploading progress into the AWS
                if (progress == 100) {
                    $scope.progressMode = 'indeterminate';
                }
            };


            $scope.uploader.onCompleteItem = function (fileItem, response, status) {
                $scope.progressMode = 'determinate';

                if (status != 200 || response == '') return;

                if (!response.error && response.id) {

                    dataset.uid = response.uid;

                    dataset.dirty = 1;
                    dataset.fileName = fileItem.file.name;
                    dataset.raw_rowObjects_coercionScheme = response.raw_rowObjects_coercionScheme;
                    dataset.fe_excludeFields = response.fe_excludeFields;
                    dataset.fe_excludeFieldsObjDetail = response.fe_excludeFieldsObjDetail;
                    dataset.replacement = response.replacement;

                    $mdToast.show(
                        $mdToast.simple()
                            .textContent(dataset.fileName + ' uploaded!')
                            .position('top right')
                            .hideDelay(3000)
                    );
                    $scope.uploader.queue = [];

                } else {
                    // Error
                    $mdToast.show(
                        $mdToast.simple()
                            .textContent(response.error)
                            .position('top right')
                            .hideDelay(3000)
                    );
                    fileItem.isError = true;
                    fileItem.isUploaded = false;
                    fileItem.isSuccess = false;
                }
            };

            $scope.addNewDatasource = function () {
                if ( !dataset.fileName && !dataset.connection) {

                    $mdDialog.show(
                        $mdDialog.alert()
                            .clickOutsideToClose(true)
                            .title('Warning!')
                            .textContent('You need to upload the main datasource first!')
                            .ariaLabel('Alert Dialog Demo')
                            .ok('Got it!')
                    );
                    return;
                }

                $scope.addingAdditionalDatasource = true;
                $scope.additionalDatasources.push(initSource({}));

            };

            $scope.removeSource = function(dataset, notify) {


                 DatasetService.deleteSource(dataset._id)
                .then(function(response) {

                    if (response.status == 200) {
                        var toastFileName = (dataset.connection)? 'Remote datasource connection' : dataset.fileName;

                        if  (dataset.connection) {
                            $scope.addingSourceType = '';
                            delete dataset.connection;
                        } else dataset.fileName = null;


                        dataset.raw_rowObjects_coercionScheme = {};
                        $scope.uploader.queue = [];
                        if(notify) {
                            $mdToast.show(
                            $mdToast.simple()
                                .textContent(toastFileName + ' removed.')
                                .position('top right')
                                .hideDelay(3000)
                        );
                        }
                    }


                });




            };

            $scope.removeAdditionalDatasource = function (additionalDatasource, notify) {
                if (additionalDatasource._id) {
                    DatasetService.removeSubdataset(additionalDatasource._id).then(function () {
                        var file_n = (additionalDatasource.connection)? 'Remote datasource connection' : additionalDatasource.fileName;
                        if(notify) {
                            $mdToast.show(
                                    $mdToast.simple()
                                        .textContent( file_n + ' removed.')
                                        .position('top right')
                                        .hideDelay(3000)
                                );
                        }
                        $scope.additionalDatasources.splice(length - 1, 1);

                    }, function (error) {
                        $mdToast.show(
                                $mdToast.simple()
                                    .textContent(error)
                                    .position('top right')
                                    .hideDelay(3000)
                            );
                    });
                }
            };

            $scope.removeSourceDialog = function(datasource, callback, ev) {
                $mdDialog.show({
                    templateUrl: 'templates/blocks/dataset.removesource.html',
                    parent: angular.element(document.body),
                    targetEvent: ev,
                    clickOutsideToClose: true,
                    fullscreen: true,
                    // locals: {
                    //     title: datasource.fileName,
                    // },
                    controller: function($scope, $mdDialog) {
                        $scope.title = datasource.fileName;
                        $scope.connection = (datasource.connection) ? true: false;
                        $scope.url = (datasource.connection)? datasource.connection.url: '';
                        $scope.hide = function() {
                            $mdDialog.hide();
                        };
                        $scope.cancel = function() {
                            $mdDialog.cancel();
                        };
                    }
                })
                    .then(function () {
                        callback(datasource, true);
                    });
            };

            $scope.clearAll = function (id, title, ev) {
                $mdDialog.show({
                    templateUrl: 'templates/blocks/dataset.clearall.html',
                    parent: angular.element(document.body),
                    targetEvent: ev,
                    clickOutsideToClose: true,
                    fullscreen: true,
                    locals: {
                        title: title,
                    },
                    controller: function($scope, $mdDialog) {
                        $scope.title = title;
                        $scope.hide = function() {
                            $mdDialog.hide();
                        };
                        $scope.cancel = function() {
                            $mdDialog.cancel();
                        };
                    }
                })
                    .then(function () {
                        var addlDatasources = $scope.additionalDatasources;
                        $scope.removeSource(dataset, false);
                        for (var i = 0; i < addlDatasources.length; i++) {
                            $scope.removeAdditionalDatasource(addlDatasources[i], false);
                        }
                        $mdToast.show(
                        $mdToast.simple()
                            .textContent('All data sources cleared.')
                            .position('top right')
                            .hideDelay(3000)
                    );
                    }, function(error) {
                        $mdToast.show(
                        $mdToast.simple()
                            .textContent(error)
                            .position('top right')
                            .hideDelay(3000)
                    );
                    });
            };

            $scope.uploadNewDatasource = function() {
                $scope.uploader.uploadAll();
                $scope.uploader.queue = [];
                $scope.dataset.dirty = 0;
                $scope.primaryAction.text = 'Next';
                $scope.primaryAction.do = _save;
            }

        }]);