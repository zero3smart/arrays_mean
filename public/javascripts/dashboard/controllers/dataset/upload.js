angular.module('arraysApp')
    .controller('DatasetUploadCtrl', ['$scope', 'dataset', 'sources', 'FileUploader', '$mdToast', '$mdDialog', '$state', 'AuthService', 'DatasetService', 'AssetService',
        function ($scope, dataset, sources, FileUploader, $mdToast, $mdDialog, $state, AuthService, DatasetService, AssetService) {

            $scope.$parent.$parent.dataset = dataset;
            $scope.$parent.$parent.currentNavItem = 'Upload';
            $scope.progressMode = "determinate";
            $scope.sources = sources;

            var token = AuthService.getToken();

            $scope.uploader = new FileUploader({
                url: '/api/dataset/upload',
                formData: [{id: dataset._id}],
                queueLimit: 1, // Limited for each dataset
                headers: {
                    'Authorization': 'Bearer ' + token
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
                    $scope.uploader.clearQueue();
                    $scope.uploader.addToQueue(item);
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
                            .textContent('You need to upload the parent datasource first!')
                            .ariaLabel('Alert Dialog Demo')
                            .ok('Got it!')
                    );
                    return;
                }

                var _source = {};

                var _uploader = new FileUploader({
                    url: '/api/dataset/upload',
                    formData: [{id: dataset._id, uid: $scope.sources.length, child: true}],
                    queueLimit: 1, // Limited for each dataset
                    headers: {
                        'Authorization': 'Bearer ' + token
                    }

                });
                _uploader.onWhenAddingFileFailed = onWhenAddingFileFailed;
                _uploader.onProgressAll = function(progress) {
                    // TODO: Need to calculate the uploading progress into the AWS
                    if (progress == 100) {
                        var self = this;
                        var source = $scope.sources.find(function(a) {
                            return a.uploader = self;
                        });
                        source.progressMode = "indeterminate";
                    }
                };
                _uploader.onCompleteItem = function (fileItem, response, status, headers) {
                    var self = this;
                    var source = $scope.sources.find(function(a) {
                        return a.uploader = self;
                    });
                    source.progressMode = "determinate";

                    if (status != 200 || response == '') return;

                    if (!response.error && response.id) {
                        $mdToast.show(
                            $mdToast.simple()
                                .textContent('Datasource to merge was uploaded successfully!')
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

                _source.uploader = _uploader;
                _source.progressMode = "determinate";
                $scope.sources.push(_source);
            };

            $scope.removeDatasource = function () {
                var length = $scope.sources.length;
                $scope.sources.splice(length-1, 1);
                // TODO: Remove item from schema dataset on the backend
            };

            $scope.navigateData = function(id) {
                $state.transitionTo('dashboard.dataset.data', {id: id}, {
                    reload: true,
                    inherit: false,
                    notify: true
                });
            }
        }
    ]);