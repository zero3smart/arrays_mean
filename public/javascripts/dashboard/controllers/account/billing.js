angular.module('arraysApp')
    .controller('BillingCtrl', ['$scope', '$mdDialog', '$state', '$http', 'Billing', 'Subscriptions', 'Plans', 
        function($scope, $mdDialog, $state, $http, Billing, Subscriptions, Plans) {

            $scope.errors = {};

            // Default to Credit Card tab selected
            $scope.selectedTab = 0;
            $scope.paymentMethod = '';

            // Set defaults for empty fields
            $scope.billing = {
                month: 01,
                year: 2016,

                country: 'US'
            };

            // Get billing info from Recurly
            Billing.get()
            .$promise.then(function(res) {
                console.log(res);

                var billingInfo = res.data.billing_info;

                // Filter out blank fields coming back from Recurly
                for (var field in billingInfo) {
                    if ( typeof billingInfo[field] === 'string' ) {
                        $scope.billing[field] = billingInfo[field];
                    }
                }

                // Set tab based on payment method
                if (billingInfo.account_type) {
                    $scope.selectedTab = 1;
                    $scope.paymentMethod = 'Bank Account';
                } else {
                    $scope.selectedTab = 0;
                    $scope.paymentMethod = 'Credit Card (' + billingInfo.card_type + ')';
                    $scope.billing.number = billingInfo.first_six + 'XXXXXX' + billingInfo.last_four;
                }
            }, function(err) {});


            //Get subscriptions info from Recurly
            Subscriptions.get()
            .$promise.then(function(res) {
                console.log(res);

                $scope.subscription = res.data.subscriptions.subscription[0];
                $scope.subscription.quantity._ = parseInt($scope.subscription.quantity._);

                //Get plans info from Recurly
                Plans.get({ plan_code: $scope.subscription.plan.plan_code })
                .$promise.then(function(res) {
                    console.log(res);

                    $scope.plan = res.data.plan;
                });
            });


            $scope.$parent.currentNavItem = 'billing';

            //
            // for testing
            //
            // display name, cost per dataset
            $scope.testPlans = {
                trial: {
                    name: 'Trial',
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

            $scope.testUser.p = 'trial';
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

            // Set whether using credit card or bank account depending on which tab is selected
            $scope.onTabChanges = function(currentTab){
                $scope.billing.payment_type = currentTab;
            };

            $scope.updateBillingInfo = function(ev) {
                Billing.update(null, $scope.billing)
                .$promise.then(function(res) {
                    console.log(res);

                    if (res.statusCode === 200) {
                        console.log('success');

                        $state.go('dashboard.account.billing');
                    } else {
                        console.log('error');
                        $scope.errors = res.data.errors.error;
                    }
                }, function(err) {});
            };

    }]);
