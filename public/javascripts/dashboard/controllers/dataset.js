angular.module('arraysApp')
    .controller('DatasetCtrl', ['$scope', '$location', '$state', '$rootScope','DatasetService',
        function($scope, $location, $state, $rootScope,DatasetService) {
        	$scope.currentStep = $state.current.name;

        	//Keep track of state when navigating without breadcrumbs
        	$rootScope.$on('$stateChangeStart',
				function(event, toState, toParams, fromState, fromParams){
				    $scope.currentStep = toState.name;
				})

        	$scope.navigate = function(step) {

                 var finalizedDataset = angular.copy($scope.dataset);
                delete finalizedDataset.columns;
                delete finalizedDataset._team;
                if ($scope.dataset.author) {
                    delete finalizedDataset.author;
                }




                DatasetService.save(finalizedDataset)
                .then(function() {
                    $scope.currentStep = step;
                    switch (step) {
                        case 'dashboard.dataset.settings':
                        if ($scope.dataset._id) {
                            $location.path('/dashboard/dataset/settings/' + $scope.dataset._id);
                        }
                        break;
                        case 'dashboard.dataset.upload':
                        if ($scope.dataset._id) {
                            $location.path('/dashboard/dataset/upload/' + $scope.dataset._id);
                        }
                        break;
                        case 'dashboard.dataset.data':
                        if ($scope.dataset.uid) {

                            $location.path('/dashboard/dataset/data/' + $scope.dataset._id);
                        }
                        break;
                        case 'dashboard.dataset.views':
                            $location.path('/dashboard/dataset/views/' + $scope.dataset._id);
                        break;
                        case 'dashboard.dataset.done':
                        if ( ($scope.dataset.fe_listed && $scope.dataset.fe_visible && $scope.dataset.fe_views.default_view )|| (!$scope.dataset.fe_listed && !$scope.dataset.fe_visible) ) {
                            $location.path('/dashboard/dataset/done/' + $scope.dataset._id);
                        }
                        break;
                    }

                })

        		
        	};

            $scope.convertToURLSafe = function(input) {
                return input.replace(/\.[^/.]+$/, "").toLowerCase().replace(/[^A-Z0-9]+/ig, "_");
            };

}]);
