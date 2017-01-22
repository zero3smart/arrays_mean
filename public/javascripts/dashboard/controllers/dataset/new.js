angular.module('arraysApp')

    .controller('DatasetNewCtrl', ['$scope', '$state', 'dataset', 'datasetTitles', 'DatasetService', '$mdToast',
        function($scope, $state, dataset, datasetTitles, DatasetService, $mdToast) {

            $scope.datasetTitles = datasetTitles; // for checking if title in use

            $scope.$parent.$parent.dataset = dataset;
            $scope.$parent.$parent.currentNavItem = 'Settings';

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

                            $state.transitionTo('dashboard.dataset.upload', {id: response.data.id}, {
                                reload: true,
                                inherit: false,
                                notify: true
                            });

                        }
                        $scope.submitting = false;
                    }, function (error) {

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
        }]);
