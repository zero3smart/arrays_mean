angular.module('arraysApp')

    .controller('DatasetSettingsCtrl', ['$scope', '$state', 'dataset', 'DatasetService', '$mdToast', 'FileUploader', 'AssetService',
        function($scope, $state, dataset, DatasetService, $mdToast, FileUploader, AssetService) {

            $scope.primaryAction.text = 'Publish';
            $scope.$watch('settingsForm.$valid', function(validity) {
                if (validity !== undefined) {
                    $scope.formValidity = validity;
                    $scope.primaryAction.disabled = !validity;
                }
            });
            $scope.primaryAction.do = function() {
                $scope.submitForm($scope.formValidity);
            };

            // still needed now that this step comes later?

            if (!dataset.fe_listed) {dataset.fe_listed = false;}
            if (!dataset.fe_visible) {dataset.fe_visible = false;}

            var original_feVisible = dataset.fe_visible;


          $scope.colors = [

                // ['#FA2A00','#FFFFFF'] // brandColor, iconColor
                '#FA2A00',
                '#FEB600',
                '#79F800',
                '#005CFF',
                '#FE00FF',
                '#EF0069',
                '#00DAE5',
                '#009E9D',
                '#7A00F6',
                '#dddddd',
                '#4A4A4A'
            ];
            if(!dataset.brandColor) { dataset.brandColor = $scope.colors[0]; }


            $scope.pickColor = function(color) {
                dataset.brandColor = color;
            }


            // if (!dataset.url) {
            //     dataset.url = $scope.convertToURLSafe(dataset.title);
            // }
            if (!dataset.importRevision) {dataset.importRevision = 1;}

            $scope.$parent.$parent.dataset = dataset;
            $scope.$parent.$parent.currentNavItem = 'settings';

            $scope.updatePublishSettings = function() {
                if(!dataset.fe_visible) {
                    dataset.isPublic = false;
                    dataset.fe_listed = false;
                } else {
                    if(dataset.imported) {
                        DatasetService.update($scope.$parent.$parent.dataset._id,{isPublic: dataset.isPublic,
                            fe_visible: dataset.fe_visible,fe_listed:dataset.fe_listed})
                       
                    }
                }
            };

            $scope.promptCacheFilter = function() {
                if (original_feVisible !== dataset.fe_visible && (dataset.dirty == 0 || dataset.dirty == 4)) {
                    dataset.dirty = 3;
                }
            };

            $scope.submitForm = function(isValid) {


                if (isValid) {
                    $scope.submitting = true;
                    if (!dataset.author) {
                        dataset.author = $scope.user._id;
                        dataset._team = $scope.team._id;
                        dataset.fe_displayTitleOverrides = {};
                    }
                    dataset.updatedBy = $scope.user._id;

                    var finalizedDataset = angular.copy(dataset);
                    delete finalizedDataset.columns;




                    DatasetService.save(finalizedDataset).then(function (response) {

                        if (response.status == 200) {

                            $mdToast.show(
                                $mdToast.simple()
                                    .textContent(dataset._id ? 'Dataset updated successfully!' : 'New Dataset was created successfully!')
                                    .position('top right')
                                    .hideDelay(3000)
                            );

                            $state.transitionTo('dashboard.dataset.done', {id: response.data.id}, {
                                reload: true,
                                inherit: false,
                                notify: true
                            });
                        }
                        $scope.submitting = false;
                    }, function (error) {

                        // console.log(error);

                        $mdToast.show(
                            $mdToast.simple()
                                .textContent(error)
                                .position('top right')
                                .hideDelay(5000)
                        );
                        $scope.submitting = false;
                    });
                }
            };

            // banner upload
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
                        $scope.imageUploader.uploadAll();

                    });
            };

        }
    ]);
