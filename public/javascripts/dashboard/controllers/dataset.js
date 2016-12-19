angular.module('arraysApp')
    .controller('DatasetCtrl', ['$scope', '$location', '$state', '$rootScope',
        function($scope, $location, $state, $rootScope) {
        	$scope.currentStep = $state.current.name;

        	//Keep track of state when navigating without breadcrumbs
        	$rootScope.$on('$stateChangeStart', 
				function(event, toState, toParams, fromState, fromParams){ 
				    $scope.currentStep = toState.name;
				})

        	$scope.navigate = function(step) {
        		$scope.currentStep = step;
        		switch (step) {
        			case 'dashboard.dataset.settings':
        			$location.path('/dashboard/dataset/settings/' + $scope.dataset._id);
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
        			if ($scope.dataset.fn_new_rowPrimaryKeyFromRowObject) {
        				$location.path('/dashboard/dataset/views/' + $scope.dataset._id);
	        		}
        			break;
        			case 'dashboard.dataset.done':
        			if ($scope.dataset.fe_views.default_view) {
        				$location.path('/dashboard/dataset/done/' + $scope.dataset._id);
        			}
        			break;
        		}
        	};

        }]
    );