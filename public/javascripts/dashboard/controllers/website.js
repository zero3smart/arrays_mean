angular.module('arraysApp')
    .controller('WebsiteCtrl', ['$scope', 'AuthService', 'FileUploader','AssetService','Team','$mdToast',
        function($scope, AuthService,FileUploader,AssetService,Team,$mdToast) {

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
                    AssetService.getPutUrlForTeamAssets($scope.team._id,fileItem.file.type,fileItem.assetType,fileItem.file.name)
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
                    var asset = fileItem.assetType;
                
                    $scope.team[asset] = fileItem.uploadUrls[asset].publicUrl + '?' + new Date().getTime();

                    if ($scope.vm.websiteForm.$pristine) {
                        $scope.vm.websiteForm.$setDirty();
                    }

                     $mdToast.show(
                        $mdToast.simple()
                            .textContent('Image uploaded successfully!')
                            .position('top right')
                            .hideDelay(3000)
                    );

                }
            }

            $scope.submitForm = function(isValid) {
                // console.log($scope.user._team);
                if (isValid) {
                    AuthService.updateTeam($scope.team)
                    .then(function(teams) {
                        $scope.$parent.teams = AuthService.allTeams();
                        $scope.$parent.team = AuthService.currentTeam();

                        $scope.vm.websiteForm.$setPristine();

                         $mdToast.show(
                            $mdToast.simple()
                                .textContent('Team updated successfully!')
                                .position('top right')
                                .hideDelay(3000)
                        );


                    })






                }
               
            }


   









          


            
        }
    ]);