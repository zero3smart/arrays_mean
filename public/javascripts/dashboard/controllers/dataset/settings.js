angular.module('arraysApp')

    .controller('DatasetSettingsCtrl', ['$scope', '$state', 'dataset', 'DatasetService', '$mdToast',
        function($scope, $state, dataset, DatasetService, $mdToast) {

            if (!dataset.fe_listed) {dataset.fe_listed = false;}
            $scope.$parent.$parent.dataset = dataset;
            $scope.$parent.$parent.currentNavItem = 'Settings';

            $scope.colors = [
                '#FA2A00',
                '#FEB600',
                '#79F800',
                '#005CFF',
                '#FE00FF',
                '#EF0069',
                '#00DAE5',
                '#009E9D',
                '#7A00F6'
            ];
            $scope.selected = dataset.brandColor || $scope.colors[0];
            console.log($scope.colors.length);
            $scope.pickColor = function(color) {
                $scope.selected = color;
                dataset.brandColor = color;
            }

           $scope.submitForm = function(isValid) {

                if (isValid) {
                    $scope.submitting = true;
                    if (!dataset.author) {
                        dataset.author = $scope.user._id;
                        dataset._team = $scope.team._id;
                        dataset.fe_displayTitleOverrides = {};
                    }
                    dataset.updatedBy = $scope.user._id;



                    DatasetService.save(dataset).then(function (response) {

                       if (response.status == 200) {
                            $mdToast.show(
                                $mdToast.simple()
                                    .textContent(dataset._id ? 'Dataset updated successfully!' : 'New Dataset was created successfully!')
                                    .position('top right')
                                    .hideDelay(3000)
                            );

                            $state.transitionTo('dashboard.dataset.upload', {id: response.data.id}, {
                                reload: true,
                                inherit: false,
                                notify: true
                            });
                       }
                        $scope.submitting = false;
                    }, function (error) {

                        console.log(error);

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
