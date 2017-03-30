angular.module('arraysApp')

    .controller('DatasetNewCtrl', ['$scope', '$state', 'dataset', 'DatasetService', '$mdToast',
        function($scope, $state, dataset, DatasetService, $mdToast) {

            $scope.$parent.$parent.dataset = dataset;
            $scope.$parent.$parent.currentNavItem = 'Settings';

            // $scope.tutorial.message = 'Enter a name for your visualization and click \'Next\'.';

            $scope.submitForm = function(isValid) {

                //Send notification to Intercom when new visualization is submitted
                window.Intercom('trackEvent', 'New Viz Created', {
                   viz_title: dataset.title,
                });

                //Send notification to Intercom when new visualization is submitted
                userengage('event.newVizCreated', {viz_title: dataset.title});



                if (isValid) {
                    $scope.submitting = true;

                    if (!dataset.author) {

                        dataset.author = $scope.user._id;
                        dataset._team = $scope.team._id;
                    }
                    dataset.uid = dataset.title.toLowerCase().replace(/[^A-Z0-9]+/ig, '_');

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
                                .hideDelay(3000)
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
                scope: {
                    datasetId : '=',
                    submittingFlag: '='

                },
                link: function(scope,elem,attr,model) {

                    model.$asyncValidators.titleAvailable = function(modelValue,viewValue) {

                        var value = (modelValue || viewValue).toLowerCase().replace(/[^A-Z0-9]+/ig, '_'); // same as uid in upload.js
                        var team = AuthService.currentTeam();
                        var deferred = $q.defer();

                        scope.submittingFlag = true;

                        DatasetService.search({uid: value, _team: team._id})
                        .then(function(response) {

                            scope.submittingFlag = false;

                            if (response.status == 200) {
                                if (response.data.length > 0) {

                                    if (response.data.length == 1 && scope.datasetId == response.data[0]._id) {
                                        deferred.resolve(true);
                                    } else {
                                        deferred.reject(false);

                                    }


                                } else {
                                    deferred.resolve(true);
                                }
                            }

                        });
                        return deferred.promise;
                    };

                }
            };

        }]);