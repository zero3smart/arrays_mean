
angular.module('arraysApp')
    .controller('DatasetUploadCtrl', ['$scope', 'dataset', 'additionalDatasources', 'FileUploader', '$mdToast', '$mdDialog', '$state', 'AuthService', 'DatasetService',
        function ($scope, dataset, additionalDatasources, FileUploader, $mdToast, $mdDialog, $state, AuthService, DatasetService) {


            $scope.$parent.$parent.dataset = dataset;
            $scope.$parent.$parent.currentNavItem = 'upload';
            $scope.progressMode = 'determinate';

            $scope.addingSourceType = ''; // ['csv', 'json', 'database']
            $scope.addSourceType = function(type) {
                if (type == 'database') {
                    if (!dataset.connection) {
                        dataset.connection = {};
                        dataset.connection.type = 'hadoop'; //default
                    }
                } else {
                    dataset.connection = null;
                }
                return $scope.addingSourceType = type;
            };

            $scope.addingAdditionalDatasource = false; // this can become addingAdditionalSourceType

            $scope.primaryAction.text = 'Next';
            $scope.$watch('dataset.fileName', function(hasFile) {
                $scope.primaryAction.disabled = !(hasFile && hasFile !== null);
            });
            $scope.$watch('dataset.connection', function(connection) {

                $scope.primaryAction.disabled = !(connection && connection.type && connection.url && connection.tableName);
            });
            $scope.primaryAction.do = function() {
                $scope.$parent.navigate('dashboard.dataset.data');
            };

            $scope.additionalDatasources = additionalDatasources.map(function(additionalDatasource) {
                return initSource(additionalDatasource);
            });

            $scope.connectToDB = function() {
                
            }


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
                                .textContent(fileItem.file.name + ' was uploaded successfully!')
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

                additionalDatasource.sourceType = '';
                additionalDatasource.setSourceType = function(type) {
                    additionalDatasource.sourceType = type;
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

                    $mdToast.show(
                        $mdToast.simple()
                            .textContent(dataset.fileName + ' uploaded successfully!')
                            .position('top right')
                            .hideDelay(3000)
                    );

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
                if (!dataset.fileName) {
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
                        var toastFileName = dataset.fileName;
                        dataset.fileName = null;
                        $scope.uploader.queue = [];
                        if(notify) {
                            $mdToast.show(
                                $mdToast.simple()
                                    .textContent(toastFileName + ' removed successfully!')
                                    .position('top right')
                                    .hideDelay(5000)
                            );
                        }
                    }



                });

            };

            $scope.removeAdditionalDatasource = function (additionalDatasource, notify) {
                if (additionalDatasource._id) {
                    DatasetService.removeSubdataset(additionalDatasource._id).then(function () {
                        if(notify) {
                            $mdToast.show(
                                    $mdToast.simple()
                                        .textContent(additionalDatasource.fileName + ' was removed successfully!')
                                        .position('top right')
                                        .hideDelay(5000)
                                );
                        }
                        $scope.additionalDatasources.splice(length - 1, 1);

                    }, function (error) {
                        $mdToast.show(
                                $mdToast.simple()
                                    .textContent(error)
                                    .position('top right')
                                    .hideDelay(5000)
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
                            .textContent('All data sources successfully cleared!')
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

        }]);
