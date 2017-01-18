angular.module('arraysApp')
    .controller('BillingCtrl', ['$scope', '$mdDialog', '$state', '$http', 'Account', 'Billing', 'Subscriptions', 'Plans', 
        function($scope, $mdDialog, $state, $http, Account, Billing, Subscriptions, Plans) {

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


            // Get account info from Recurly
            Account.get()
            .$promise.then(function(res) {
                console.log(res.data);

                // If no account, make new one
                if (res.data.error) {
                    newAccount();
                } else if (res.data.account) {
                    getBilling();
                    getSubscriptions();
                }
            });


            // Create new billing account in Recurly
            function newAccount() {
                Account.save()
                .$promise.then(function(res) {
                    getBilling();
                    getSubscriptions();
                });
            }


            // Get billing info from Recurly
            function getBilling() {
                Billing.get()
                .$promise.then(function(res) {
                    console.log(res.data);

                    if (res.data.error) {
                        $scope.billing.exists = false;
                    } else if (res.data.billing_info) {

                        $scope.billing.exists = true;

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
                    }
                }, function(err) {});
            }


            //Get subscriptions info from Recurly
            function getSubscriptions() {
                Subscriptions.get()
                .$promise.then(function(res) {
                    console.log(res.data);

                    if (res.data.error) {
                        
                    } else if (res.data.subscriptions.subscription) {

                        $scope.subscription = res.data.subscriptions.subscription;
                        $scope.subscription.quantity._ = parseInt(res.data.subscriptions.subscription.quantity._);

                        // Calculate trial days remaining
                        var now = new Date();
                        var end = new Date($scope.subscription.trial_ends_at._);
                        var timeDiff = Math.abs(end.getTime() - now.getTime());
                        var diffDays = Math.ceil(timeDiff / (1000 * 3600 * 24));
                        $scope.subscription.trial_days_left = diffDays;

                        getPlans();
                    }
                });
            }


            //Get plans info from Recurly
            function getPlans() {
                Plans.get()
                .$promise.then(function(res) {
                    console.log(res.data.plans.plan);

                    $scope.plans = res.data.plans.plan;

                    $scope.plan = getPlanFromPlans($scope.subscription.plan.plan_code, res.data.plans.plan);
                    $scope.annualplan = getPlanFromPlans('arrays-pro-yearly', res.data.plans.plan);

                    console.log($scope.annualplan);
                });
            }


            // Get current plan
            function getPlanFromPlans(plan_code, plans) {
                var currentPlan = plans.filter(function(plan) {
                    return plan.plan_code === plan_code;
                });

                return currentPlan[0];
            }


            $scope.$parent.currentNavItem = 'billing';

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
                        billing: $scope.billing,
                        plan: $scope.plan,
                        annualplan: $scope.annualplan,
                        subscription: $scope.subscription,
                        Subscriptions: Subscriptions
                    }
                });
            };

            function BillingDialogController($scope, $mdDialog, billing, plan, annualplan, subscription, Subscriptions) {
                $scope.billing = billing;
                $scope.plan = plan;
                $scope.annualplan = annualplan;
                $scope.subscription = subscription;

                $scope.hide = function() {
                    $mdDialog.hide();
                };
                $scope.cancel = function() {
                    $mdDialog.cancel();
                };
                $scope.updateQuantitity = function() {
                    var subscrId = $scope.subscription.uuid;
                    Subscriptions.update({ subscrId: subscrId }, { quantity: $scope.subscription.quantity._ })
                    .$promise.then(function(res) {
                        console.log(res.data);
                        $mdDialog.hide();
                    });
                };
                $scope.updatePlanCode = function(plan_code) {
                    console.log(plan_code);
                    var subscrId = $scope.subscription.uuid;
                    Subscriptions.update({ subscrId: subscrId }, {
                        quantity: $scope.subscription.quantity._,
                        plan_code: 'arrays-pro-yearly'
                    })
                    .$promise.then(function(res) {
                        console.log(res.data);
                        getSubscriptions();
                        $mdDialog.hide();
                    });
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

                    if (res.statusCode === 200 || res.statusCode === 201) {
                        $state.go('dashboard.account.billing');
                    } else {
                        console.log(res.data);
                        $scope.errors = res.data.errors.error;
                    }
                }, function(err) {});
            };

            $scope.startTrialSubscription = function(plan_code) {
                Subscriptions.save({ 'plan_code': plan_code })
                .$promise.then(function(res) {
                    console.log(res.data);

                    if (res.statusCode === 200 || res.statusCode === 201) {
                        getSubscriptions();
                    } else {
                        console.log(res.data);
                    }
                });
            };

    }]);
