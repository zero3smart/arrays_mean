angular.module('arraysApp')

    .controller('DatasetNewCtrl', ['$scope', '$state', 'dataset', 'DatasetService', '$mdToast',
        function($scope, $state, dataset, DatasetService, $mdToast) {

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
        }])
        .directive('uniqueTitle',['DatasetService', 'AuthService', '$q', function (DatasetService, AuthService, $q) {
            return {
                restrict: 'A',
                require: 'ngModel',
                link: function(scope,elem,attr,model) {

                    model.$asyncValidators.titleAvailable = function(modelValue,viewValue) {
                        var value = modelValue|| viewValue;
                        var user = AuthService.currentUser(),
                            deferred = $q.defer();
                        DatasetService.getDatasetsWithQuery({_team:user.defaultLoginTeam._id, uid: {$exists: true}})
                        .then(function(datasets) {
                            var datasetTitles = datasets.reduce(function(titles, dataset){
                                titles.push(dataset.title);
                                return titles;
                            }, []);

                            if (datasetTitles.indexOf(value)) {
                                deferred.resolve(true);
                            } else {
                                deferred.reject(false);
                            }
                        });
                        return deferred.promise;
                    };

                }
            };

        }]);
