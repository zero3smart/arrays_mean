angular.module('arraysApp')
    .controller('PaymentsCtrl', ['$scope', '$log', 'invoices', 
        function($scope, $log, invoices) {

            invoices.$promise.then(function(data) {
                $log.log(data.data.invoices.invoice);

                $scope.invoices = invoices.data.invoices.invoice;
                
            });


        }]);
