angular.module('arraysApp')
    .controller('DatasetSettingsCtrl', ['$scope', 'dataset',
        function($scope, dataset) {

            $scope.$parent.$parent.dataset = dataset;
            $scope.$parent.$parent.currentNavItem = 'Settings';

            $scope.save = function() {

            }
        }
    ]);