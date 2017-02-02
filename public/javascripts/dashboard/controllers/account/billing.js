angular.module('arraysApp')
    .controller('BillingCtrl', ['$scope', '$mdDialog', '$state', '$http', '$window', 'AuthService', 'Account', 'Billing', 'Subscriptions', 'Plans', 
        function($scope, $mdDialog, $state, $http, $window, AuthService, Account, Billing, Subscriptions, Plans) {

            $scope.errors = {};

            // Default to Credit Card tab selected
            $scope.selectedTab = 0;
            $scope.paymentMethod = '';

            // Set defaults for empty fields
            var d = new Date();

            $scope.billing = {
                month: parseInt(('0' + (d.getMonth() + 1)).slice(-2)), // Set current month and year
                year: d.getFullYear(),

                country: 'US'
            };


            // Get account info from Recurly
            Account.get()
            .$promise.then(function(res) {
                // console.log(res.data);

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
                    // console.log(res.data);

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
                            $scope.billing.numberPlaceholder = billingInfo.first_six + 'XXXXXX' + billingInfo.last_four;
                        }
                    }
                }, function(err) {});
            }


            //Get subscriptions info from Recurly
            function getSubscriptions() {
                Subscriptions.get()
                .$promise.then(function(res) {
                    // console.log(res.data);

                    if (res.data.error) {
                        
                    } else if (res.data.subscriptions.subscription) {

                        if (typeof res.data.subscriptions.subscription === 'object') { // If there's only one subscription
                            $scope.subscription = res.data.subscriptions.subscription;
                            $scope.subscription.quantity._ = parseInt(res.data.subscriptions.subscription.quantity._);
                        } else { // If there are more than on subscriptions in the system
                            var curSubscription = res.data.subscriptions.subscription[0];
                            $scope.subscription = curSubscription;
                            $scope.subscription.quantity._ = parseInt(curSubscription.quantity._);
                        }

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
                    // console.log(res.data.plans.plan);

                    $scope.plans = res.data.plans.plan;

                    $scope.plan = getPlanFromPlans($scope.subscription.plan.plan_code, res.data.plans.plan);
                    $scope.annualplan = getPlanFromPlans('arrays-pro-yearly', res.data.plans.plan);

                    // console.log($scope.annualplan);
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
                $scope.updateQuantity = function() {
                    var subscrId = $scope.subscription.uuid;
                    Subscriptions.update({ subscrId: subscrId }, { quantity: $scope.subscription.quantity._ })
                    .$promise.then(function(res) {
                        // console.log(res.data);
                        $mdDialog.hide();
                    });
                };
                $scope.updatePlanCode = function(plan_code) {
                    // console.log(plan_code);
                    var subscrId = $scope.subscription.uuid;
                    Subscriptions.update({ subscrId: subscrId }, {
                        quantity: $scope.subscription.quantity._,
                        plan_code: plan_code
                    })
                    .$promise.then(function(res) {
                        // console.log(res.data);
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
                    // console.log(res);

                    if (res.statusCode === 200 || res.statusCode === 201) {
                        $state.go('dashboard.account.billing');
                    } else {
                        // console.log(res.data);
                        if (res.data.errors.error.length) {
                            $scope.errors = res.data.errors.error;
                        } else {
                            $scope.errors[0] = res.data.errors.error;
                        }

                        angular.forEach($scope.errors, function(error, key) {

                            // console.log($scope.billing_info);

                            // Get error field name from returned errors
                            var field = error.$.field;
                            var fieldSplit = field.split('.');
                            var fieldName = fieldSplit[fieldSplit.length - 1];

                            // console.log(fieldName);

                            switch (fieldName) {
                                case 'country':
                                    $scope.billing_info.billing_address.country.$setValidity('invalid', false);

                                case 'address1':
                                    $scope.billing_info.billing_address.address1.$setValidity('invalid', false);

                                case 'city':
                                    $scope.billing_info.billing_address.city.$setValidity('invalid', false);

                                case 'state':
                                    $scope.billing_info.billing_address.state.$setValidity('invalid', false);

                                case 'zip':
                                    $scope.billing_info.billing_address.zip.$setValidity('invalid', false);

                                // default:
                            }

                        
                    }
                }, function(err) {});
            };

            $scope.startTrialSubscription = function(plan_code) {
                Subscriptions.save({ 'plan_code': plan_code })
                .$promise.then(function(res) {
                    // console.log(res.data);

                    if (res.statusCode === 200 || res.statusCode === 201) {
                        if ($scope.$parent.team.subscription) {
                            $scope.$parent.team.subscription.state = 'in_trial';
                        } else {
                            $scope.$parent.team.subscription = { state: 'in_trial'};
                        }
                        $state.go('dashboard.account.billing');
                    } else {
                        // console.log(res.data);
                    }
                });
            };

            $scope.startSubscription = function(plan_code) {
                var now = new Date();
                var isoNow = now.toISOString();
                Subscriptions.save({ 'plan_code': plan_code, 'trial_ends_at': isoNow })
                .$promise.then(function(res) {
                    // console.log(res.data);

                    if (res.statusCode === 200 || res.statusCode === 201) {
                        $scope.$parent.team.subscription.state = 'active';
                        $state.go('dashboard.account.billing');
                    } else {
                        // console.log(res.data);
                    }
                });
            };

            $scope.cancelSubscription = function() {
                var subscrId = $scope.subscription.uuid;
                Subscriptions.cancel({ subscrId: subscrId })
                .$promise.then(function(res) {
                    // console.log(res.data);
                    $scope.$parent.team.subscription.state = 'canceled';
                    $state.go('dashboard.account.billing');
                });
            };

            $scope.reactivateSubscription = function() {
                var subscrId = $scope.subscription.uuid;
                Subscriptions.reactivate({ subscrId: subscrId })
                .$promise.then(function(res) {
                    // console.log(res.data);
                    $scope.$parent.team.subscription.state = 'active';
                    getSubscriptions();
                });
            };

    }]);
