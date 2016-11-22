angular.module('arraysApp')
    .controller('DatasetUploadCtrl', ['$scope', 'dataset', 'sources', 'FileUploader', '$mdToast', '$state',
        function($scope, dataset, sources, FileUploader, $mdToast, $state) {

            $scope.$parent.$parent.dataset = dataset;
            $scope.$parent.$parent.currentNavItem = 'Upload';
            $scope.progressMode = "determinate";
            $scope.sources = sources;

            $scope.uploader = new FileUploader({
                url: '/api/dataset/upload',
                formData: [{id: dataset._id}],
                queueLimit: 1 // Limited for each dataset
            });

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

                    $state.transitionTo('admin.dataset.data', {id: response.id}, { reload: true, inherit: false, notify: true });
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