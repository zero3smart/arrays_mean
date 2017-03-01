angular.module('arraysApp')
    .controller('JoinTableDialogCtrl',['$scope','$mdDialog','dataset',
    	'DatasetService', function($scope, $mdDialog, dataset, DatasetService) {

           
        $scope.dataset = dataset;
        $scope.colsByJoinTableName = {};


        $scope.loadCols = function() {
            if (!$scope.dataset.connection.join.tableName || $scope.dataset.connection.join.tableName == "") return;
            if (!$scope.colsByJoinTableName[$scope.dataset.connection.join.tableName]) {
                $scope.colsByJoinTableName[$scope.dataset.connection.join.tableName] = [];
            }

            DatasetService.colsForJoinTables($scope.dataset._id,$scope.dataset.connection)
            .then(function(response) {
                if (response.status == 200 && response.data) {
                    $scope.colsByJoinTableName[$scope.dataset.connection.join.tableName] = response.data;
                }
            })
        }

        if (dataset.connection.join && dataset.connection.join.tableName) {
            $scope.loadCols();
        }


        $scope.remove = function() {
            $scope.dialog.form.$setDirty();
            delete $scope.dataset.connection.join;


        }

        $scope.save = function() {

            if ($scope.dataset.connection.join) {
                $scope.dataset.joinCols = $scope.colsByJoinTableName[$scope.dataset.connection.join.tableName];
            } else {
                $scope.dataset.joinCols = [];
            }

            

            $mdDialog.hide($scope.dataset);
        }
                    
}])


