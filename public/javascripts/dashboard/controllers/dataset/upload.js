angular.module('arraysApp')
    .controller('DatasetUploadCtrl', ['$scope', 'dataset', 'additionalDatasources', 'FileUploader', '$mdToast', '$mdDialog', '$state', 'AuthService', 'DatasetService', 'AssetService',
        function ($scope, dataset, additionalDatasources, FileUploader, $mdToast, $mdDialog, $state, AuthService, DatasetService, AssetService) {

            $scope.$parent.$parent.dataset = dataset;
            $scope.$parent.$parent.currentNavItem = 'Upload';
            $scope.progressMode = 'determinate';
            $scope.addingAdditionalDatasource = false;

            $scope.additionalDatasources = additionalDatasources.map(function(additionalDatasource) {
                return initSource(additionalDatasource);
            });

            $scope.verifyUID = function() {
                if (dataset.title == '' || typeof dataset.title == 'undefined' || dataset.title == null) {
                    $scope.uploadForm.title.$setValidity('unique',true);
                    return;
                }

                var uid = dataset.title.toLowerCase().replace(/[^A-Z0-9]+/ig, '_');

                DatasetService.search({uid:uid, _team: $scope.team._id})
                .then(function(response) {
                    if (response.status == 200) {

                        if (response.data.length > 0) {

                            if (response.data.length == 1 && response.data[0]._id == dataset._id) {
                                $scope.uploadForm.title.$setValidity('unique',true);
                                return;
                            }
                            $scope.uploadForm.title.$setValidity('unique',false);

                        } else {
                            $scope.uploadForm.title.$setValidity('unique',true);
                        }
                    }
                });





            };

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

                    if (!additionalDatasource.dataset_uid)
                        additionalDatasource.dataset_uid = item.file.name.replace(/\.[^/.]+$/, '').toLowerCase().replace(/[^A-Z0-9]+/ig, '_');

                    item.formData[0].dataset_uid = additionalDatasource.dataset_uid;
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
                    uploader.removeFromQueue(fileItem);
                    $scope.addingAdditionalDatasource = false;
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

            //right now only for uploading banner, later maybe icons.
            $scope.imageUploader = new FileUploader({
                method: 'PUT',
                disableMultipart: true,
                filters: [
                    {
                        name: 'imageFilter',
                        fn: function (item) {
                            var type = '|' + item.type.slice(item.type.lastIndexOf('/') + 1) + '|';
                            return '|jpg|png|jpeg|bmp|gif|'.indexOf(type) !== -1;
                        }
                    }
                ],

            });

            $scope.imageUploader.onCompleteItem = function (fileItem, response, status) {
                if (status == 200) {
                    var reload = false;
                    if (dataset.banner) {
                        reload = true;
                    }
                    dataset.banner = fileItem.publicUrl;
                    DatasetService.save(dataset).then(function () {
                        if (reload) {
                            dataset.banner = dataset.banner + '?' + new Date().getTime();
                        }
                        $mdToast.show(
                            $mdToast.simple()
                                .textContent('Image upload successfully!')
                                .position('top right')
                                .hideDelay(3000)
                        );
                    });
                }
            };

            $scope.imageUploader.onBeforeUploadItem = function (item) {
                item.headers['Content-Type'] = item.file.type;
            };

            $scope.imageUploader.onAfterAddingFile = function (fileItem) {
                // console.log(fileItem);
                if ($scope.imageUploader.queue.length > 0) {
                    $scope.imageUploader.queue[0] = fileItem;
                }
                AssetService.getPutUrlForDatasetAssets($scope.dataset._id, fileItem.file.type, fileItem.file.name)
                    .then(function (urlInfo) {
                        fileItem.url = urlInfo.putUrl;
                        fileItem.publicUrl = urlInfo.publicUrl;
                    });
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
                if (!dataset.uid) {
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
