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
                $scope.getUploadUrl(fileItem);
            }

            $scope.getUploadUrl = function(fileItem) {
                fileItem.assetType = "icon"; // "logo" // "icon" // "logo_header"
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

                    if ($scope.vm.teamIconsForm.$pristine) {
                        $scope.vm.teamIconsForm.$setDirty();
                    }

                    $mdToast.show(
                        $mdToast.simple()
                            .textContent('Image uploaded successfully!')
                            .position('top right')
                            .hideDelay(3000)
                    );
                }
            }

            $scope.submitForm = function(formName, isValid) {
                // console.log($scope.user._team);
                if (isValid) {
                    AuthService.updateTeam($scope.team)
                    .then(function(teams) {
                        $scope.$parent.teams = AuthService.allTeams();
                        $scope.$parent.team = AuthService.currentTeam();
                        $scope.vm[formName].$setPristine();

                        $mdToast.show(
                            $mdToast.simple()
                                .textContent('Team updated successfully!')
                                .position('top right')
                                .hideDelay(3000)
                        );
                    })
                }
            }

            $scope.loadIcons = function() {
                AssetService.loadIcons()
                .then(function(data) {
                    $scope.iconsUrl = data;
                })
            }
            $scope.loadIcons();

        }
    ])
    /**
    * The ng-thumb directive
    * @author: nerv
    * @version: 0.1.2, 2014-01-09
    */
    .directive('ngThumb', ['$window', function($window) {
        var helper = {
            support: !!($window.FileReader && $window.CanvasRenderingContext2D),
            isFile: function(item) {
                return angular.isObject(item) && item instanceof $window.File;
            },
            isImage: function(file) {
                var type =  '|' + file.type.slice(file.type.lastIndexOf('/') + 1) + '|';
                return '|jpg|png|jpeg|bmp|gif|'.indexOf(type) !== -1;
            }
        };

        return {
            restrict: 'A',
            template: '<canvas/>',
            link: function(scope, element, attributes) {
                if (!helper.support) return;

                var params = scope.$eval(attributes.ngThumb);

                if (!helper.isFile(params.file)) return;
                if (!helper.isImage(params.file)) return;

                var canvas = element.find('canvas');
                var reader = new FileReader();

                reader.onload = onLoadFile;
                reader.readAsDataURL(params.file);

                function onLoadFile(event) {
                    var img = new Image();
                    img.onload = onLoadImage;
                    img.src = event.target.result;
                }

                function onLoadImage() {
                    var width = params.width || this.width / this.height * params.height;
                    var height = params.height || this.height / this.width * params.width;
                    canvas.attr({ width: width, height: height });
                    canvas[0].getContext('2d').drawImage(this, 0, 0, width, height);
                }
            }
        };
    }]);
