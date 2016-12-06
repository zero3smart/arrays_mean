angular.module('arraysApp')
    .controller('DatasetUploadCtrl', ['$scope', 'dataset', 'sources', 'FileUploader', '$mdToast', '$state','AuthService','DatasetService','AssetService',
        function($scope, dataset, sources, FileUploader, $mdToast, $state,AuthService,DatasetService,AssetService) {

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
                filters:[
                    {
                        name: "imageFilter",
                        fn: function(item,options) {
                            var type = '|' + item.type.slice(item.type.lastIndexOf('/') + 1) + '|';
                            return '|jpg|png|jpeg|bmp|gif|'.indexOf(type) !== -1;
                        }
                    }
                ],

            })


            $scope.imageUploader.onCompleteItem = function(fileItem,response,status,header) {
                if (status == 200) {
                    var reload = false;
                    if (dataset.banner) {
                        reload = true;
                    }
                    dataset.banner = fileItem.publicUrl;
                    DatasetService.save(dataset).then(function() {
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

            $scope.imageUploader.onBeforeUploadItem = function(item) {
                item.headers['Content-Type'] = item.file.type;
            }

            $scope.imageUploader.onAfterAddingFile = function(fileItem) {
                console.log(fileItem);
                if ($scope.imageUploader.queue.length > 0) {
                    $scope.imageUploader.queue[0] = fileItem;
                }
                AssetService.getPutUrlForDatasetAssets($scope.dataset._id,fileItem.file.type,fileItem.file.name)
                .then(function(urlInfo) {
                    fileItem.url = urlInfo.putUrl;
                    fileItem.publicUrl = urlInfo.publicUrl;
                })
            }   

            // CALLBACKS

            $scope.uploader.onWhenAddingFileFailed = function(item, filter, options) {
                // console.info('onWhenAddingFileFailed', item, filter, options);
                if (filter.name == 'queueLimit') {
                    $scope.uploader.clearQueue();
                    $scope.uploader.addToQueue(item);
                }
            };
            $scope.uploader.onAfterAddingFile = function(fileItem) {
                console.info('onAfterAddingFile', fileItem);
            };
            $scope.uploader.onAfterAddingAll = function(addedFileItems) {
                // console.info('onAfterAddingAll', addedFileItems);
            };
            $scope.uploader.onBeforeUploadItem = function(item) {
                // TODO: Multiple upload for dataset merge, for example, SPL
                // $scope.uploader.formData.push({index: item.uploader.queue.length - 1});
                // console.info('onBeforeUploadItem', item);
            };
            $scope.uploader.onProgressItem = function(fileItem, progress) {
                // console.info('onProgressItem', fileItem, progress);
            };
            $scope.uploader.onProgressAll = function(progress) {
                // 10% for uploading file to the AWS
                // TODO: Need to calculate the uploading progress into the AWS
                // console.info('onProgressAll', progress);
                if (progress == 100) {
                    $scope.progressMode = "indeterminate";
                }
            };
            $scope.uploader.onSuccessItem = function(fileItem, response, status, headers) {
                console.info('onSuccessItem', fileItem, response, status, headers);
            };
            $scope.uploader.onErrorItem = function(fileItem, response, status, headers) {
                console.info('onErrorItem', fileItem, response, status, headers);
            };
            $scope.uploader.onCancelItem = function(fileItem, response, status, headers) {
                console.info('onCancelItem', fileItem, response, status, headers);
            };
            $scope.uploader.onCompleteItem = function(fileItem, response, status, headers) {
                console.info('onCompleteItem', fileItem, response, status, headers);

                $scope.progressMode = "determinate";

                if (status != 200 || response == '') return;

                if (!response.error && response.id) {
                    $mdToast.show(
                        $mdToast.simple()
                            .textContent('Dataset uploaded successfully!')
                            .position('top right')
                            .hideDelay(3000)
                    );

                    $state.transitionTo('dashboard.dataset.data', {id: response.id}, { reload: true, inherit: false, notify: true });
                } else {
                    // Error
                    $mdToast.show(
                        $mdToast.simple()
                            .textContent(response.error)
                            .position('top right')
                            .hideDelay(3000)
                    );

                    $scope.uploader.cancelAll();
                }
            };
            $scope.uploader.onCompleteAll = function() {
                // console.info('onCompleteAll');
            };
        }
    ]);