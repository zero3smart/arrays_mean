angular.module('arraysApp')
    .controller('BillingCtrl', ['$scope', '$mdDialog', '$state', '$http',
        function($scope, $mdDialog, $state, $http) {

            $scope.$parent.currentNavItem = 'billing';

            //
            // for testing
            //
            // display name, cost per dataset
            $scope.testPlans = {
                trial: {
                    name: 'Pro',
                    cost: { // per month
                        trial: 0,
                        month: 0,
                        year: 0
                    }
                },
                pro: {
                    name: 'Pro',
                    cost: { // per month
                        month: 149,
                        year: 99
                    }
                },
                // enterprise: {
                //     name: 'Enterprise',
                // }
            };
            // for testing, to attach to user
            $scope.testUser = {};

            $scope.testUser.p = 'pro';
            $scope.testUser.plan = $scope.testPlans[$scope.testUser.p];
            $scope.testUser.paidDatasets = 2; // not the current number but the allowed, paid number
            $scope.testUser.billingCycle = 'month';

            // $scope.testUser.p = 'trial';
            // $scope.testUser.plan = $scope.testPlans[$scope.testUser.p];
            // $scope.testUser.paidDatasets = 1;
            // $scope.testUser.billingCycle = 'trial';


            //
            // also for testing only--does Schema or Recurly have its own JSON data for countries/states?
            //
            $http.get('https://raw.githubusercontent.com/astockwell/countries-and-provinces-states-regions/master/countries.json')
            .then(function(res){
                $scope.countries = res.data;
            });

            $http.get('https://gist.githubusercontent.com/mshafrir/2646763/raw/8b0dbb93521f5d6889502305335104218454c2bf/states_titlecase.json')
             .then(function(res){
                 $scope.availableStates = res.data;
            });


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
