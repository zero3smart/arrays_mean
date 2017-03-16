angular.module('arraysApp')
    .controller('PaymentsCtrl', ['$scope', '$log', 'adjustments', 
        function($scope, $log, adjustments) {

            adjustments.$promise.then(function(data) {
                // $log.log(data.data.adjustments.adjustment);

                if (data.data.adjustments.adjustment.length > 1) {
                    $scope.adjustments = data.data.adjustments.adjustment;
                } else {
                    $scope.adjustments = [data.data.adjustments.adjustment];
                }
                
            });

        }]);
