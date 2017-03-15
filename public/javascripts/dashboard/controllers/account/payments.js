angular.module('arraysApp')
    .controller('PaymentsCtrl', ['$scope', '$log', 'invoices', 
        function($scope, $log, invoices) {

            invoices.$promise.then(function(data) {
                // $log.log(data.data.invoices.invoice);

                if (data.data.invoices.invoice.length > 1) {
                    $scope.invoices = data.data.invoices.invoice;
                } else {
                    $scope.invoices = [data.data.invoices.invoice];
                }
                
            });

        }]);
