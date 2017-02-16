angular.module('arraysApp')
    .controller('BillingCtrl', ['$scope', '$mdDialog', '$state', '$http', '$window', '$mdToast', 'AuthService', 'Account', 'Billing', 'Subscriptions', 'Plans', 'DatasetService', 
        function($scope, $mdDialog, $state, $http, $window, $mdToast, AuthService, Account, Billing, Subscriptions, Plans, DatasetService) {

            // Get datasets for quantity limit
            DatasetService.getDatasetsWithQuery({ _team: $scope.user.defaultLoginTeam._id })
                .then(function(res) {
                    var filteredDatasets = res.filter(function(dataset) {
                        return dataset.sample === false;
                    });

                    // Don't allow subscription quantity to go to zero if there are no datasets
                    $scope.datasetsQuantity = filteredDatasets.length === 0 ? 1 : filteredDatasets.length;
                }, function(err) {});


            $scope.loaded = false;

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
                    getBilling(function() {
                        getSubscriptions(function() {
                            getPlans(function() {
                                $scope.loaded = true;
                            });
                        });
                    });
                }
            });


            // Create new billing account in Recurly
            function newAccount() {
                Account.save()
                .$promise.then(function(res) {
                    getBilling(function() {
                        getSubscriptions(function() {
                            getPlans(function() {
                                $scope.loaded = true;
                            });
                        });
                    });
                    
                });
            }


            // Get billing info from Recurly
            function getBilling(callback) {
                var self = this;

                Billing.get()
                .$promise.then(function(res) {
                    // console.log(res.data);

                    if (res.data.error) {
                        $scope.billing.exists = false;
                        $scope.loaded = true;
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

                    if (callback) return callback();
                }, function(err) {});
            }


            //Get subscriptions info from Recurly
            function getSubscriptions(callback) {
                Subscriptions.get()
                .$promise.then(function(res) {
                    // console.log(res.data);

                    if (res.data.error) {
                        $scope.loaded = true;
                    } else if (res.data.subscriptions.subscription) {

                        if (res.data.subscriptions.subscription.length > 1) {
                            var curSubscription = res.data.subscriptions.subscription[0];
                            $scope.subscription = curSubscription;
                            $scope.subscription.quantity._ = parseInt(curSubscription.quantity._);
                        } else {
                            $scope.subscription = res.data.subscriptions.subscription;
                            $scope.subscription.quantity._ = parseInt(res.data.subscriptions.subscription.quantity._);
                        }

                        // Calculate trial days remaining
                        var now = new Date();
                        var end = new Date($scope.subscription.trial_ends_at._);
                        var timeDiff = Math.abs(end.getTime() - now.getTime());
                        var diffDays = Math.ceil(timeDiff / (1000 * 3600 * 24));
                        $scope.subscription.trial_days_left = diffDays;

                        if (callback) return callback();
                    }
                }, function(err) {});
            }


            //Get plans info from Recurly
            function getPlans(callback) {
                Plans.get()
                .$promise.then(function(res) {
                    // console.log(res.data.plans.plan);

                    $scope.plans = res.data.plans.plan;

                    $scope.plan = getPlanFromPlans($scope.subscription.plan.plan_code, res.data.plans.plan);
                    $scope.annualplan = getPlanFromPlans('pro-annual', res.data.plans.plan);

                    // console.log($scope.annualplan);

                    if (callback) return callback();
                }, function(err) {});
            }


            // Get current plan
            function getPlanFromPlans(plan_code, plans) {
                var currentPlan = plans.filter(function(plan) {
                    return plan.plan_code === plan_code;
                });

                return currentPlan[0];
            }


            //Update subscription quantity
            function updateQuantity(subscrId, quantity, callback) {
                Subscriptions.update({ subscrId: subscrId }, { quantity: quantity })
                .$promise.then(function(res) {
                    // console.log(res.data);
                    $scope.$parent.team.subscription.quantity = quantity;
                    $window.sessionStorage.setItem('team', JSON.stringify($scope.$parent.team));
                    return callback();
                }, function(err) {});
            }


            $scope.$parent.currentNavItem = 'billing';

            $scope.countries = [{"name":"Afghanistan","code":"AF"},{"name":"Åland Islands","code":"AX"},{"name":"Albania","code":"AL"},{"name":"Algeria","code":"DZ"},{"name":"American Samoa","code":"AS"},{"name":"AndorrA","code":"AD"},{"name":"Angola","code":"AO"},{"name":"Anguilla","code":"AI"},{"name":"Antarctica","code":"AQ"},{"name":"Antigua and Barbuda","code":"AG"},{"name":"Argentina","code":"AR"},{"name":"Armenia","code":"AM"},{"name":"Aruba","code":"AW"},{"name":"Australia","code":"AU"},{"name":"Austria","code":"AT"},{"name":"Azerbaijan","code":"AZ"},{"name":"Bahamas","code":"BS"},{"name":"Bahrain","code":"BH"},{"name":"Bangladesh","code":"BD"},{"name":"Barbados","code":"BB"},{"name":"Belarus","code":"BY"},{"name":"Belgium","code":"BE"},{"name":"Belize","code":"BZ"},{"name":"Benin","code":"BJ"},{"name":"Bermuda","code":"BM"},{"name":"Bhutan","code":"BT"},{"name":"Bolivia","code":"BO"},{"name":"Bosnia and Herzegovina","code":"BA"},{"name":"Botswana","code":"BW"},{"name":"Bouvet Island","code":"BV"},{"name":"Brazil","code":"BR"},{"name":"British Indian Ocean Territory","code":"IO"},{"name":"Brunei Darussalam","code":"BN"},{"name":"Bulgaria","code":"BG"},{"name":"Burkina Faso","code":"BF"},{"name":"Burundi","code":"BI"},{"name":"Cambodia","code":"KH"},{"name":"Cameroon","code":"CM"},{"name":"Canada","code":"CA"},{"name":"Cape Verde","code":"CV"},{"name":"Cayman Islands","code":"KY"},{"name":"Central African Republic","code":"CF"},{"name":"Chad","code":"TD"},{"name":"Chile","code":"CL"},{"name":"China","code":"CN"},{"name":"Christmas Island","code":"CX"},{"name":"Cocos (Keeling) Islands","code":"CC"},{"name":"Colombia","code":"CO"},{"name":"Comoros","code":"KM"},{"name":"Congo","code":"CG"},{"name":"Congo, The Democratic Republic of the","code":"CD"},{"name":"Cook Islands","code":"CK"},{"name":"Costa Rica","code":"CR"},{"name":"Cote D'Ivoire ","code":"CI"},{"name":"Croatia","code":"HR"},{"name":"Cuba","code":"CU"},{"name":"Cyprus","code":"CY"},{"name":"Czech Republic","code":"CZ"},{"name":"Denmark","code":"DK"},{"name":"Djibouti","code":"DJ"},{"name":"Dominica","code":"DM"},{"name":"Dominican Republic","code":"DO"},{"name":"Ecuador","code":"EC"},{"name":"Egypt","code":"EG"},{"name":"El Salvador","code":"SV"},{"name":"Equatorial Guinea","code":"GQ"},{"name":"Eritrea","code":"ER"},{"name":"Estonia","code":"EE"},{"name":"Ethiopia","code":"ET"},{"name":"Falkland Islands (Malvinas)","code":"FK"},{"name":"Faroe Islands","code":"FO"},{"name":"Fiji","code":"FJ"},{"name":"Finland","code":"FI"},{"name":"France","code":"FR"},{"name":"French Guiana","code":"GF"},{"name":"French Polynesia","code":"PF"},{"name":"French Southern Territories","code":"TF"},{"name":"Gabon","code":"GA"},{"name":"Gambia","code":"GM"},{"name":"Georgia","code":"GE"},{"name":"Germany","code":"DE"},{"name":"Ghana","code":"GH"},{"name":"Gibraltar","code":"GI"},{"name":"Greece","code":"GR"},{"name":"Greenland","code":"GL"},{"name":"Grenada","code":"GD"},{"name":"Guadeloupe","code":"GP"},{"name":"Guam","code":"GU"},{"name":"Guatemala","code":"GT"},{"name":"Guernsey","code":"GG"},{"name":"Guinea","code":"GN"},{"name":"Guinea-Bissau","code":"GW"},{"name":"Guyana","code":"GY"},{"name":"Haiti","code":"HT"},{"name":"Heard Island and Mcdonald Islands","code":"HM"},{"name":"Holy See (Vatican City State)","code":"VA"},{"name":"Honduras","code":"HN"},{"name":"Hong Kong","code":"HK"},{"name":"Hungary","code":"HU"},{"name":"Iceland","code":"IS"},{"name":"India","code":"IN"},{"name":"Indonesia","code":"ID"},{"name":"Iran, Islamic Republic Of","code":"IR"},{"name":"Iraq","code":"IQ"},{"name":"Ireland","code":"IE"},{"name":"Isle of Man","code":"IM"},{"name":"Israel","code":"IL"},{"name":"Italy","code":"IT"},{"name":"Jamaica","code":"JM"},{"name":"Japan","code":"JP"},{"name":"Jersey","code":"JE"},{"name":"Jordan","code":"JO"},{"name":"Kazakhstan","code":"KZ"},{"name":"Kenya","code":"KE"},{"name":"Kiribati","code":"KI"},{"name":"Korea, Democratic People's Republic of ","code":"KP"},{"name":"Korea, Republic of","code":"KR"},{"name":"Kuwait","code":"KW"},{"name":"Kyrgyzstan","code":"KG"},{"name":"Lao People's Democratic Republic ","code":"LA"},{"name":"Latvia","code":"LV"},{"name":"Lebanon","code":"LB"},{"name":"Lesotho","code":"LS"},{"name":"Liberia","code":"LR"},{"name":"Libyan Arab Jamahiriya","code":"LY"},{"name":"Liechtenstein","code":"LI"},{"name":"Lithuania","code":"LT"},{"name":"Luxembourg","code":"LU"},{"name":"Macao","code":"MO"},{"name":"Macedonia, The Former Yugoslav Republic of","code":"MK"},{"name":"Madagascar","code":"MG"},{"name":"Malawi","code":"MW"},{"name":"Malaysia","code":"MY"},{"name":"Maldives","code":"MV"},{"name":"Mali","code":"ML"},{"name":"Malta","code":"MT"},{"name":"Marshall Islands","code":"MH"},{"name":"Martinique","code":"MQ"},{"name":"Mauritania","code":"MR"},{"name":"Mauritius","code":"MU"},{"name":"Mayotte","code":"YT"},{"name":"Mexico","code":"MX"},{"name":"Micronesia, Federated States of","code":"FM"},{"name":"Moldova, Republic of","code":"MD"},{"name":"Monaco","code":"MC"},{"name":"Mongolia","code":"MN"},{"name":"Montserrat","code":"MS"},{"name":"Morocco","code":"MA"},{"name":"Mozambique","code":"MZ"},{"name":"Myanmar","code":"MM"},{"name":"Namibia","code":"NA"},{"name":"Nauru","code":"NR"},{"name":"Nepal","code":"NP"},{"name":"Netherlands","code":"NL"},{"name":"Netherlands Antilles","code":"AN"},{"name":"New Caledonia","code":"NC"},{"name":"New Zealand","code":"NZ"},{"name":"Nicaragua","code":"NI"},{"name":"Niger","code":"NE"},{"name":"Nigeria","code":"NG"},{"name":"Niue","code":"NU"},{"name":"Norfolk Island","code":"NF"},{"name":"Northern Mariana Islands","code":"MP"},{"name":"Norway","code":"NO"},{"name":"Oman","code":"OM"},{"name":"Pakistan","code":"PK"},{"name":"Palau","code":"PW"},{"name":"Palestinian Territory, Occupied","code":"PS"},{"name":"Panama","code":"PA"},{"name":"Papua New Guinea","code":"PG"},{"name":"Paraguay","code":"PY"},{"name":"Peru","code":"PE"},{"name":"Philippines","code":"PH"},{"name":"Pitcairn","code":"PN"},{"name":"Poland","code":"PL"},{"name":"Portugal","code":"PT"},{"name":"Puerto Rico","code":"PR"},{"name":"Qatar","code":"QA"},{"name":"Reunion","code":"RE"},{"name":"Romania","code":"RO"},{"name":"Russian Federation","code":"RU"},{"name":"Rwanda","code":"RW"},{"name":"Saint Helena","code":"SH"},{"name":"Saint Kitts and Nevis","code":"KN"},{"name":"Saint Lucia","code":"LC"},{"name":"Saint Pierre and Miquelon","code":"PM"},{"name":"Saint Vincent and the Grenadines","code":"VC"},{"name":"Samoa","code":"WS"},{"name":"San Marino","code":"SM"},{"name":"Sao Tome and Principe","code":"ST"},{"name":"Saudi Arabia","code":"SA"},{"name":"Senegal","code":"SN"},{"name":"Serbia and Montenegro","code":"CS"},{"name":"Seychelles","code":"SC"},{"name":"Sierra Leone","code":"SL"},{"name":"Singapore","code":"SG"},{"name":"Slovakia","code":"SK"},{"name":"Slovenia","code":"SI"},{"name":"Solomon Islands","code":"SB"},{"name":"Somalia","code":"SO"},{"name":"South Africa","code":"ZA"},{"name":"South Georgia and the South Sandwich Islands","code":"GS"},{"name":"Spain","code":"ES"},{"name":"Sri Lanka","code":"LK"},{"name":"Sudan","code":"SD"},{"name":"Suriname","code":"SR"},{"name":"Svalbard and Jan Mayen","code":"SJ"},{"name":"Swaziland","code":"SZ"},{"name":"Sweden","code":"SE"},{"name":"Switzerland","code":"CH"},{"name":"Syrian Arab Republic","code":"SY"},{"name":"Taiwan, Province of China","code":"TW"},{"name":"Tajikistan","code":"TJ"},{"name":"Tanzania, United Republic of","code":"TZ"},{"name":"Thailand","code":"TH"},{"name":"Timor-Leste","code":"TL"},{"name":"Togo","code":"TG"},{"name":"Tokelau","code":"TK"},{"name":"Tonga","code":"TO"},{"name":"Trinidad and Tobago","code":"TT"},{"name":"Tunisia","code":"TN"},{"name":"Turkey","code":"TR"},{"name":"Turkmenistan","code":"TM"},{"name":"Turks and Caicos Islands","code":"TC"},{"name":"Tuvalu","code":"TV"},{"name":"Uganda","code":"UG"},{"name":"Ukraine","code":"UA"},{"name":"United Arab Emirates","code":"AE"},{"name":"United Kingdom","code":"GB"},{"name":"United States","code":"US"},{"name":"United States Minor Outlying Islands","code":"UM"},{"name":"Uruguay","code":"UY"},{"name":"Uzbekistan","code":"UZ"},{"name":"Vanuatu","code":"VU"},{"name":"Venezuela","code":"VE"},{"name":"Viet Nam","code":"VN"},{"name":"Virgin Islands, British","code":"VG"},{"name":"Virgin Islands, U.S.","code":"VI"},{"name":"Wallis and Futuna","code":"WF"},{"name":"Western Sahara","code":"EH"},{"name":"Yemen","code":"YE"},{"name":"Zambia","code":"ZM"},{"name":"Zimbabwe","code":"ZW"}];

            $scope.availableStates = [{"name":"Alabama","abbreviation":"AL"},{"name":"Alaska","abbreviation":"AK"},{"name":"American Samoa","abbreviation":"AS"},{"name":"Arizona","abbreviation":"AZ"},{"name":"Arkansas","abbreviation":"AR"},{"name":"California","abbreviation":"CA"},{"name":"Colorado","abbreviation":"CO"},{"name":"Connecticut","abbreviation":"CT"},{"name":"Delaware","abbreviation":"DE"},{"name":"District Of Columbia","abbreviation":"DC"},{"name":"Federated States Of Micronesia","abbreviation":"FM"},{"name":"Florida","abbreviation":"FL"},{"name":"Georgia","abbreviation":"GA"},{"name":"Guam","abbreviation":"GU"},{"name":"Hawaii","abbreviation":"HI"},{"name":"Idaho","abbreviation":"ID"},{"name":"Illinois","abbreviation":"IL"},{"name":"Indiana","abbreviation":"IN"},{"name":"Iowa","abbreviation":"IA"},{"name":"Kansas","abbreviation":"KS"},{"name":"Kentucky","abbreviation":"KY"},{"name":"Louisiana","abbreviation":"LA"},{"name":"Maine","abbreviation":"ME"},{"name":"Marshall Islands","abbreviation":"MH"},{"name":"Maryland","abbreviation":"MD"},{"name":"Massachusetts","abbreviation":"MA"},{"name":"Michigan","abbreviation":"MI"},{"name":"Minnesota","abbreviation":"MN"},{"name":"Mississippi","abbreviation":"MS"},{"name":"Missouri","abbreviation":"MO"},{"name":"Montana","abbreviation":"MT"},{"name":"Nebraska","abbreviation":"NE"},{"name":"Nevada","abbreviation":"NV"},{"name":"New Hampshire","abbreviation":"NH"},{"name":"New Jersey","abbreviation":"NJ"},{"name":"New Mexico","abbreviation":"NM"},{"name":"New York","abbreviation":"NY"},{"name":"North Carolina","abbreviation":"NC"},{"name":"North Dakota","abbreviation":"ND"},{"name":"Northern Mariana Islands","abbreviation":"MP"},{"name":"Ohio","abbreviation":"OH"},{"name":"Oklahoma","abbreviation":"OK"},{"name":"Oregon","abbreviation":"OR"},{"name":"Palau","abbreviation":"PW"},{"name":"Pennsylvania","abbreviation":"PA"},{"name":"Puerto Rico","abbreviation":"PR"},{"name":"Rhode Island","abbreviation":"RI"},{"name":"South Carolina","abbreviation":"SC"},{"name":"South Dakota","abbreviation":"SD"},{"name":"Tennessee","abbreviation":"TN"},{"name":"Texas","abbreviation":"TX"},{"name":"Utah","abbreviation":"UT"},{"name":"Vermont","abbreviation":"VT"},{"name":"Virgin Islands","abbreviation":"VI"},{"name":"Virginia","abbreviation":"VA"},{"name":"Washington","abbreviation":"WA"},{"name":"West Virginia","abbreviation":"WV"},{"name":"Wisconsin","abbreviation":"WI"},{"name":"Wyoming","abbreviation":"WY"}];


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
                    updateQuantity(subscrId, $scope.subscription.quantity._, function() {
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
                        getSubscriptions(function() {
                            getPlans();
                        });
                        $mdDialog.hide();
                    });
                };
            }

            // Set whether using credit card or bank account depending on which tab is selected
            $scope.onTabChanges = function(currentTab){
                $scope.billing.payment_type = currentTab;
            };

            $scope.updateBillingInfo = function(plan_code) {
                Billing.update(null, $scope.billing)
                .$promise.then(function(res) {
                    // console.log(res);

                    if (res.statusCode === 200 || res.statusCode === 201) {

                        // If adding billing for first time, create subscription
                        if (plan_code) {
                            $scope.startTrialSubscription(plan_code);
                        } else {
                            $state.go('dashboard.account.billing');
                        }
                        
                    } else {
                        // console.log(res.data);
                        if (res.data.errors.error.length) {
                            $scope.errors = res.data.errors.error;
                        } else {
                            $scope.errors[0] = res.data.errors.error;
                        }

                        // Set validation errors on fields returned in Recurly errors array
                        angular.forEach($scope.errors, function(error, key) {

                            // console.log($scope.billing_info);

                            // Get error field name from returned errors
                            var field = error.$.field;
                            var fieldSplit = field.split('.');
                            var fieldName = fieldSplit[fieldSplit.length - 1];

                            // console.log(fieldName);

                            var form;

                            // Set which form each field belongs to
                            switch (fieldName) {
                                case 'first_name':
                                case 'last_name':
                                case 'number':
                                case 'month':
                                case 'year':
                                    form = 'payment_card';
                                    break;

                                case 'name_on_account':
                                case 'routing_number':
                                case 'account_number':
                                case 'account_type':
                                    form = 'payment_bank';
                                    break;

                                case 'country':
                                case 'address1':
                                case 'city':
                                case 'state':
                                case 'zip':
                                    form = 'billing_address';
                                    break;

                                // default:
                            }

                            // Set field to invalid if error is returned from Recurly
                            if (form) $scope.billing_info[form][fieldName].$setValidity('invalid', false);

                            // Show popup notification if error doesn't belong to a particular field
                            if (fieldName === 'base' || fieldName === 'credit_card_verification_value' || fieldName === 'credit_card_number') {

                                // Show popup notification
                                $mdToast.show(
                                    $mdToast.simple()
                                    .textContent(error._)
                                    .action('Ok')
                                    .position('top right')
                                    .hideDelay(10000)
                                );
                            }
                        });

                        
                    }
                }, function(err) {});
            };

            $scope.startTrialSubscription = function(plan_code) {
                Subscriptions.save({ 'plan_code': plan_code })
                .$promise.then(function(res) {
                    // console.log(res.data);

                    if (res.statusCode === 200 || res.statusCode === 201) {
                        if ($scope.$parent.team.subscription) {
                            $scope.$parent.team.subscription.state = 'active';
                        } else {
                            $scope.$parent.team.subscription = { state: 'active'};
                        }
                        $window.sessionStorage.setItem('team', JSON.stringify($scope.$parent.team));
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
                        $window.sessionStorage.setItem('team', JSON.stringify($scope.$parent.team));
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
                    $window.sessionStorage.setItem('team', JSON.stringify($scope.$parent.team));
                    $state.go('dashboard.account.billing');
                });
            };

            $scope.reactivateSubscription = function() {
                var subscrId = $scope.subscription.uuid;
                Subscriptions.reactivate({ subscrId: subscrId })
                .$promise.then(function(res) {
                    // console.log(res.data);
                    $scope.$parent.team.subscription.state = 'active';
                    $window.sessionStorage.setItem('team', JSON.stringify($scope.$parent.team));
                    getSubscriptions();
                });
            };

    }]);
