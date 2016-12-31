angular.module('arraysApp')
    .controller('BillingCtrl', ['$scope', '$mdDialog', function($scope, $mdDialog) {

        $scope.openBillingDialog = function(ev, template) {
            $mdDialog.show({
                controller: BillingDialogController,
                templateUrl: 'templates/blocks/account.billing.' + template + '.html',
                parent: angular.element(document.body),
                targetEvent: ev,
                // clickOutsideToClose: true,
                fullscreen: true
            });
        };

        function BillingDialogController($scope, $mdDialog) {
            $scope.hide = function() {
                $mdDialog.hide();
            };
            $scope.cancel = function() {
                $mdDialog.cancel();
            };
            $scope.answer = function(answer) {
                $mdDialog.hide(answer);
            };
        }

    }]);
