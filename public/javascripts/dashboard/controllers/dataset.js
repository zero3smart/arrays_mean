angular.module('arraysApp')
    .controller('DatasetCtrl', ['$scope', '$location',
        function($scope, $location) {

        	$scope.navigate = function(step) {
        		console.log($scope.dataset);
        		switch (step) {
        			case 'Settings':
        			console.log('settings');
        			$location.path('/dashboard/dataset/settings/' + $scope.dataset._id);
        			break;
        			case 'Upload':
        			if ($scope.dataset._id) {
        				console.log('upload');
        				$location.path('/dashboard/dataset/upload/' + $scope.dataset._id);
        			}
        			break;
        			case 'Data':
        			if ($scope.dataset.format) {
	        			console.log('data');
	        			$location.path('/dashboard/dataset/data/' + $scope.dataset._id);
	        		}
        			break;
        			case 'Views':
        			if ($scope.dataset.fn_new_rowPrimaryKeyFromRowObject) {
        				console.log($scope.dataset.fn_new_rowPrimaryKeyFromRowObject);
        				console.log('views');
        				$location.path('/dashboard/dataset/views/' + $scope.dataset._id);
	        		}
        			break;
        			case 'Done':
        			if ($scope.dataset.fe_views.default_view) {
        				console.log('done');
        				$location.path('/dashboard/dataset/done/' + $scope.dataset._id);
        			}
        			break;
        		}
        	};

        }]
    );