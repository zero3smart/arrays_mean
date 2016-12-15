angular.module('arraysApp')
    .controller('DatasetUploadCtrl', ['$scope', 'dataset', 'sources', 'FileUploader', '$mdToast', '$mdDialog', '$state', 'AuthService', 'DatasetService', 'AssetService',
        function ($scope, dataset, sources, FileUploader, $mdToast, $mdDialog, $state, AuthService, DatasetService, AssetService) {

            $scope.$parent.$parent.dataset = dataset;
            $scope.$parent.$parent.currentNavItem = 'Upload';
            $scope.progressMode = "determinate";
            $scope.sources = sources.map(function(source) {
                return initSource(source)
            });

            function initSource(source) {
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
                    if (!source.dataset_uid)
                        source.dataset_uid = item.file.name.replace(/\.[^/.]+$/, "").toLowerCase().replace(/[^A-Z0-9]+/ig, "_");

                    item.formData[0].dataset_uid = source.dataset_uid;
                };

                uploader.onProgressAll = function(progress) {
                    // TODO: Need to calculate the uploading progress into the AWS
                    if (progress == 100) {
                        var self = this;
                        var source = $scope.sources.find(function(a) {
                            return a.uploader == self;
                        });
                        source.progressMode = "indeterminate";
                    }
                };

                uploader.onCompleteItem = function(fileItem, response, status, headers) {
                    var self = this;
                    var source = $scope.sources.find(function(a) {
                        return a.uploader == self;
                    });
                    source.progressMode = "determinate";

                    if (status != 200 || response == '') return;

                    if (!response.error && response.id) {
                        $mdToast.show(
                            $mdToast.simple()
                                .textContent(source.dataset_uid + ' was uploaded successfully!')
                                .position('top right')
                                .hideDelay(3000)
                        );

                        source._id = response._id;
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

                source.uploader = uploader;
                source.progressMode = "determinate";
                return source;
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
                        name: "imageFilter",
                        fn: function (item, options) {
                            var type = '|' + item.type.slice(item.type.lastIndexOf('/') + 1) + '|';
                            return '|jpg|png|jpeg|bmp|gif|'.indexOf(type) !== -1;
                        }
                    }
                ],

            })

            $scope.imageUploader.onCompleteItem = function (fileItem, response, status, header) {
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
                        )
                    })
                }
            }

            $scope.imageUploader.onBeforeUploadItem = function (item) {
                item.headers['Content-Type'] = item.file.type;
            };

            $scope.imageUploader.onAfterAddingFile = function (fileItem) {
                console.log(fileItem);
                if ($scope.imageUploader.queue.length > 0) {
                    $scope.imageUploader.queue[0] = fileItem;
                }
                AssetService.getPutUrlForDatasetAssets($scope.dataset._id, fileItem.file.type, fileItem.file.name)
                    .then(function (urlInfo) {
                        fileItem.url = urlInfo.putUrl;
                        fileItem.publicUrl = urlInfo.publicUrl;
                    })
            };

            // CALLBACKS

            function onWhenAddingFileFailed(item, filter, options) {
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
                    $scope.progressMode = "indeterminate";
                }
            };

            $scope.uploader.onCompleteItem = function (fileItem, response, status, headers) {
                $scope.progressMode = "determinate";

                if (status != 200 || response == '') return;

                if (!response.error && response.id) {
                    $mdToast.show(
                        $mdToast.simple()
                            .textContent('Dataset uploaded successfully!')
                            .position('top right')
                            .hideDelay(3000)
                    );

                    $state.transitionTo('dashboard.dataset.data', {id: response.id}, {
                        reload: true,
                        inherit: false,
                        notify: true
                    });
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

                $scope.sources.push(initSource({}));
            };

            $scope.removeSubdatasource = function () {
                var length = $scope.sources.length;
                if (length > 0) {
                    var source = $scope.sources[length - 1];
                    if (source._id) {
                        var dataset_uid = source.dataset_uid;
                        DatasetService.removeSubdataset(source._id).then(function () {
                            $mdToast.show(
                                $mdToast.simple()
                                    .textContent(dataset_uid + ' was removed successfully!')
                                    .position('top right')
                                    .hideDelay(5000)
                            );
                            $scope.sources.splice(length - 1, 1);
                        }, function (error) {
                            $mdToast.show(
                                $mdToast.simple()
                                    .textContent(error)
                                    .position('top right')
                                    .hideDelay(5000)
                            );
                        });
                    } else {
                        $scope.sources.splice(length - 1, 1);
                    }
                }
            };
        }
    ]);