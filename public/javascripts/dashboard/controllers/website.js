angular.module('arraysApp')
    .controller('WebsiteCtrl', ['$scope', 'AuthService', 'FileUploader','AssetService',
        function($scope, AuthService,FileUploader,AssetService) {


            $scope.progressMode = "determinate";

            $scope.assetsUploader = new FileUploader({
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

            $scope.assetsUploader.onAfterAddingFile = function(fileItem) {
                fileItem.uploadUrls = {};
            }   

            $scope.getUploadUrl = function(index,fileItem) {
                if (!fileItem.uploadUrls[fileItem.assetType]) {
                    AssetService.getPutUrlForTeamAssets($scope.user._team._id,fileItem.file.type,fileItem.assetType,fileItem.file.name)
                        .then(function(urlInfo) {
                            fileItem.uploadUrls[fileItem.assetType] = {url:urlInfo.putUrl,publicUrl: urlInfo.publicUrl};
                        })

                }
            }

            $scope.assetsUploader.onBeforeUploadItem = function(fileItem) {
                fileItem.url = fileItem.uploadUrls[fileItem.assetType].url;
                fileItem.headers['Content-Type'] = fileItem.file.type;
            }


            $scope.assetsUploader.onCompleteItem = function(fileItem,response,status,header) {

                if (status == 200) {
                    console.log('done');
                }
            }


            //  $scope.assetsUploader.onCompleteItem = function(fileItem,response,status,header) {
            //     if (status == 200) {
            //         var reload = false;
            //         if (dataset.banner) {
            //             reload = true;
            //         }
            //         dataset.banner = fileItem.publicUrl;
            //         DatasetService.save(dataset).then(function() {
            //             if (reload) {
            //                  dataset.banner = dataset.banner + '?' + new Date().getTime();
            //             }
            //             $mdToast.show(
            //                 $mdToast.simple()
            //                     .textContent('Image upload successfully!')
            //                     .position('top right')
            //                     .hideDelay(3000)
            //             )
            //         })
            //     }
            // }











          


            
        }
    ]);