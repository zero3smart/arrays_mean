angular.module('arraysApp')

    .controller('DatasetNewCtrl', ['$scope', '$state', 'dataset', 'DatasetService', '$mdToast',
        function($scope, $state, dataset, DatasetService, $mdToast) {

            if (!dataset.fe_listed) {dataset.fe_listed = false;}
            if (!dataset.fe_visible) {dataset.fe_visible = false;}
            $scope.$parent.$parent.dataset = dataset;
            $scope.$parent.$parent.currentNavItem = 'Settings';

            ////
            var uniquePlaceholder = Date.now();
            if (!dataset.title) {dataset.title = '_temp_' + uniquePlaceholder;}
            if (!dataset.description) {dataset.description = '_temp_' + uniquePlaceholder;}
            // if (!dataset.uid) {dataset.uid = uniquePlaceholder;}
            if (!dataset.importRevision) {dataset.importRevision = 1;}

            // $scope.submitForm = function(isValid) {

                // if (isValid) {
                    $scope.submitting = true;
                    if (!dataset.author) {
                        dataset.author = $scope.user._id;
                        dataset._team = $scope.team._id;
                        dataset.fe_displayTitleOverrides = {};
                    }
                    dataset.updatedBy = $scope.user._id;



                    DatasetService.save(dataset).then(function (response) {

                       if (response.status == 200) {
                            // $mdToast.show(
                            //     $mdToast.simple()
                            //         .textContent(dataset._id ? 'Dataset updated successfully!' : 'New Dataset was created successfully!')
                            //         .position('top right')
                            //         .hideDelay(3000)
                            // );

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
                // }
            // }
    }]);
