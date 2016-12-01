angular.module('arraysApp')
    .controller('DatasetSettingsCtrl', ['$scope', '$state', 'dataset', 'DatasetService', '$mdToast','FileUploader'
        function($scope, $state, dataset, DatasetService, $mdToast,FileUploader) {

            $scope.$parent.$parent.dataset = dataset;
            $scope.$parent.$parent.currentNavItem = 'Settings';


             var uploader = $scope.uploader = new FileUploader({
                url: 'upload.php'
            });

        // FILTERS

        uploader.filters.push({
            name: 'imageFilter',
            fn: function(item /*{File|FileLikeObject}*/, options) {
                var type = '|' + item.type.slice(item.type.lastIndexOf('/') + 1) + '|';
                return '|jpg|png|jpeg|bmp|gif|'.indexOf(type) !== -1;
            }
        });


        


            $scope.submitForm = function(isValid) {
                if (isValid) {
                    $scope.submitting = true;
                    if (!dataset.author) {
                        dataset.author = $scope.user._id;
                        dataset._team = $scope.user._team._id;
                        dataset.fe_displayTitleOverrides = {};
                    } 
                    dataset.updatedBy = $scope.user._id;



                    DatasetService.save(dataset).then(function(id) {
                        $mdToast.show(
                            $mdToast.simple()
                                .textContent(dataset._id ? 'Dataset updated successfully!' : 'New Dataset was created successfully!')
                                .position('top right')
                                .hideDelay(3000)
                        );

                        $state.transitionTo('dashboard.dataset.upload', {id: id}, { reload: true, inherit: false, notify: true });
                        $scope.submitting = false;
                    }, function(error) {
                        $mdToast.show(
                            $mdToast.simple()
                                .textContent(error)
                                .position('top right')
                                .hideDelay(5000)
                        );
                        $scope.submitting = false;
                    });
                }
            }
        }
    ]);