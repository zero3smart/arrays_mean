angular.module('arraysApp')
    .controller('BillingCtrl', ['$scope', '$mdDialog', function($scope, $mdDialog) {

        // for testing
        // name, cost per dataset
        $scope.testPlans = {
            trial: {
                name: 'Trial',
                cost: 0
            },
            pro: {
                name: 'Pro',
                cost: 149
            },
            // enterprise: {
            //     name: 'Enterprise',
            //     cost: 0
            // }
        };
        // for testing, to attach to user
        $scope.testUser = {};
        $scope.testUser.plan = $scope.testPlans.pro;
        $scope.testUser.billingCycle = 'Monthly';
        $scope.testUser.paidDatasets = 2; // not the current number but the allowed, paid number
        // for testing

        $scope.openBillingDialog = function(ev, template) {
            $mdDialog.show({
                controller: BillingDialogController,
                templateUrl: 'templates/blocks/account.billing.' + template + '.html',
                parent: angular.element(document.body),
                targetEvent: ev,
                // clickOutsideToClose: true,
                fullscreen: true,
                locals: {
                    testPlans: $scope.testPlans,
                    testUser: $scope.testUser
                }
            });
        };

        function BillingDialogController($scope, $mdDialog, testPlans, testUser) {
            $scope.testPlans = testPlans;
            $scope.testUser = testUser;

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
