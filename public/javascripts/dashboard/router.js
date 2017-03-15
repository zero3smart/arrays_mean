'use strict';

angular.module('arraysApp')
    .run(
    ['$rootScope', '$state', '$stateParams',
        function ($rootScope, $state, $stateParams) {

            $rootScope.$state = $state;
            $rootScope.$stateParams = $stateParams;

            $rootScope.$on('$stateChangeError',function(event, toState,toParams,fromState,fromParams,error) {
                event.preventDefault();

                if (error.importing == true) {
                    $state.go('dashboard.dataset.process', {id: error.datasetId});
                }
            });
        }
    ]
    )
    .config(
    ['$stateProvider', '$urlRouterProvider', '$locationProvider', '$httpProvider',
        function ($stateProvider, $urlRouterProvider, $locationProvider, $httpProvider) {

            $urlRouterProvider
                .otherwise('/dashboard/account/profile');

            $stateProvider
                    .state('dashboard', {
                        abstract: true,
                        url: '/dashboard',
                        templateUrl: 'templates/dashboard.html',
                        controller: 'AdminCtrl',
                        resolve: {
                            auth: function(AuthService) {
                                return AuthService.ensureLogIn();
                            },
                            env: function(AuthService) {
                                return AuthService.getEnv();
                            }
                        }
                    })
                    //
                    .state('dashboard.account', {
                        abstract: true,
                        url: '/account',
                        controller: 'AccountCtrl',
                        templateUrl: 'templates/account.html'
                    })
                    .state('dashboard.account.profile', {
                        url: '/profile',
                        controller: 'AccountCtrl',
                        templateUrl: 'templates/account/profile.html'
                    })
                    .state('dashboard.account.password',{
                        url: '/password',
                        controller: 'AccountCtrl',
                        templateUrl:'templates/account/password.html'
                    })
                    .state('dashboard.account.billing', {
                        url: '/billing',
                        controller: 'BillingCtrl',
                        templateUrl: 'templates/account/billing.html',
                        resolve: {
                            restrict: function(AuthService) {
                                return AuthService.ensureIsAdmin();
                            },
                            users: ['User', 'AuthService', function(User, AuthService) { //all users in this team, except myself
                                var currentTeam = AuthService.currentTeam();
                                return User.getAll({teamId: currentTeam._id});
                            }],
                            plans: ['Plans', function (Plans) {
                                return Plans.get();
                            }]
                        }
                    })
                    .state('dashboard.account.payments', {
                        url: '/payments',
                        controller: 'PaymentsCtrl',
                        templateUrl: 'templates/account/payments.html',
                        resolve: {
                            restrict: function(AuthService) {
                                return AuthService.ensureIsAdmin();
                            },
                            invoices: ['Invoices', function(Invoices) {
                                return Invoices.get();
                            }]
                        }
                    })
                    .state('dashboard.account.payment', {
                        url: '/payment/:plan_code/:quantity',
                        controller: 'BillingCtrl',
                        templateUrl: 'templates/account/payment.html',
                        resolve: {
                            users: function() {
                                return {};
                            },
                            plans: ['Plans', function (Plans) {
                                return Plans.get();
                            }]
                        }
                    })
                    .state('dashboard.account.upgradeEnterprise', {
                        url: '/upgrade/enterprise',
                        controller: 'BillingCtrl',
                        templateUrl: 'templates/account/upgrade.enterprise.html',
                        resolve: {
                            users: function() {
                                return {};
                            },
                            plans: ['Plans', function (Plans) {
                                return Plans.get();
                            }]
                        }
                    })
                    // .state('dashboard.account.close', {
                    //     url: '/close',
                    //     controller: 'BillingCtrl',
                    //     templateUrl: 'templates/account/close.html'
                    // })
                    .state('dashboard.account.cancel', {
                        url: '/cancel',
                        controller: 'BillingCtrl',
                        templateUrl: 'templates/account/cancel.html',
                        resolve: {
                            users: function() {
                                return {};
                            },
                            plans: ['Plans', function (Plans) {
                                return Plans.get();
                            }]
                        }
                    })
                    //
                    .state('dashboard.dataset', {
                        abstract: true,
                        url: '/dataset',
                        templateUrl: 'templates/dataset.html',
                        controller: 'DatasetCtrl',
                        resolve: {
                            restrict: function(auth,AuthService) {
                                return AuthService.ensureActiveSubscription();

                            }
                        }
                    })
                    .state('dashboard.dataset.list', {
                        url: '/list',
                        templateUrl: 'templates/dataset/list.html',
                        controller: 'DatasetListCtrl',
                        resolve: {
                            datasets: ['restrict','DatasetService', 'AuthService', function (restrict,DatasetService, AuthService) {
                                var user = AuthService.currentUser();
                                if (user.role == 'superAdmin' || user.role == 'admin') {

                                    return DatasetService.getDatasetsWithQuery({_team:user.defaultLoginTeam._id});

                                } else if (user.role == 'editor') {

                                    return DatasetService.getDatasetsWithQuery(
                                        { $or:[ {_id: {$in: user._editors}} , {author: user._id}], _team:user.defaultLoginTeam._id});

                                } else {
                                    return [];
                                }

                            }]
                        }
                    })
                    .state('dashboard.dataset.settings', {
                        url: '/settings/:id',
                        controller: 'DatasetSettingsCtrl as vm',
                        templateUrl: 'templates/dataset/settings.html',
                        resolve: {

                            dataset: ['restrict','DatasetService', '$stateParams','$q', function (restrict,DatasetService, $stateParams,$q) {                        
                                return DatasetService.get($stateParams.id);
                            }]
                        }
                    })
                    .state('dashboard.dataset.new', {
                        url: '/new',
                        controller: 'DatasetNewCtrl',
                        templateUrl: 'templates/dataset/new.html',
                        resolve: {
                            dataset: ['DatasetService', '$stateParams', function (DatasetService, $stateParams) {
                                return DatasetService.get($stateParams.id);
                            }]
                        }
                    })
                    .state('dashboard.dataset.upload', {
                        url: '/upload/:id',
                        templateUrl: 'templates/dataset/upload.html',
                        controller: 'DatasetUploadCtrl',
                        resolve: {
                            dataset: ['restrict','DatasetService', '$stateParams','$q', function (restrict,DatasetService, $stateParams,$q) {

                                var deferred = $q.defer();
                                DatasetService.get($stateParams.id)
                                .then(function(data) {

                                    if (data.jobId !== 0) {
                                        deferred.reject({importing: true, datasetId: data._id});
                                    } else {
                                        deferred.resolve(data);
                                    }
                                });
                                return deferred.promise;

                            }],
                            additionalDatasources: ['dataset','DatasetService', '$stateParams','$q', function (dataset,DatasetService, $stateParams
                                ,$q) {
                                var deferred = $q.defer();
                                DatasetService.getAdditionalSources($stateParams.id)
                                .then(function(additionalDatasets) {
                                    if (additionalDatasets.length > 0) {
                                        additionalDatasets.map(function(dataset) {

                                            if (dataset.jobId !== 0) {
                    

                                                deferred.reject({importing: true, datasetId: dataset.schemaId});
                                                return false;

                                            }
                                        });

                                    }
                                    deferred.resolve(additionalDatasets);

                                });
                                return deferred.promise;
                            }]
                        }
                    })
                    .state('dashboard.dataset.data', {
                        url: '/data/:id',
                        templateUrl: 'templates/dataset/data.html',
                        controller: 'DatasetDataCtrl as vm',
                        resolve: {
                            dataset: ['restrict','DatasetService', '$stateParams', function (restrict,DatasetService, $stateParams) {
                                return DatasetService.get($stateParams.id);
                            }],
                            additionalDatasources: ['restrict','DatasetService', '$stateParams', function (restrict,DatasetService, $stateParams) {
                                return DatasetService.getAdditionalSources($stateParams.id);
                            }],
                            availableTypeCoercions: ['restrict','DatasetService', function (restrict,DatasetService) {
                                return DatasetService.getAvailableTypeCoercions();
                            }]
                        }
                    })
                    .state('dashboard.dataset.views', {
                        url: '/views/:id',
                        templateUrl: 'templates/dataset/views.html',
                        controller: 'DatasetViewsCtrl as vm',
                        resolve: {

                            dataset: ['restrict','DatasetService', '$stateParams', function (restrict,DatasetService, $stateParams) {

                                return DatasetService.get($stateParams.id);
                            }],
                            previewCopy : ['DatasetService', 'dataset', function(DatasetService,dataset) {
                                var masterId = dataset._id;

                                return DatasetService.getDatasetsWithQuery({master_id: masterId});
                            }],
                            viewResource: 'View',
                            views: ['View', function (View) {
                                return View.query().$promise;
                            }],

                            user: ['restrict','AuthService', function (restrict,AuthService) {
                                return AuthService.currentUser();
                            }]
                        }
                    })
                    .state('dashboard.dataset.process', {
                        url: '/process/:id',
                        templateUrl: 'templates/dataset/process.html',
                        controller: 'DatasetProcessCtrl',
                        resolve: {
                            dataset: ['restrict','DatasetService', '$stateParams', function (restrict,DatasetService, $stateParams) {
                                return DatasetService.get($stateParams.id);
                            }],
                            additionalDatasources: ['restrict','DatasetService', '$stateParams', function (restrict,DatasetService, $stateParams) {
                                return DatasetService.getAdditionalSources($stateParams.id);
                            }]
                        }
                    })
                    .state('dashboard.team', {
                        url: '/team',
                        controller: 'WebsiteCtrl as vm',
                        templateUrl: 'templates/team.html',
                        resolve: {
                            restrict: function(auth,AuthService) {
                                return AuthService.ensureIsAdmin() && AuthService.ensureActiveSubscription();
                            }
                        }
                    })
                    .state('dashboard.team.settings', {
                        url: '/settings',
                        controller: function($scope) {
                            $scope.$parent.currentNavItem = 'settings';
                        },
                        templateUrl: 'templates/team/settings.html'
                    })
                    .state('dashboard.team.icons', {
                        url: '/icons',
                        controller: function($scope) {
                            $scope.$parent.currentNavItem = 'icons';
                        },
                        templateUrl: 'templates/team/icons.html'
                    })
                    .state('dashboard.user', {
                        url: '/user',
                        controller: 'UserCtrl as vm',
                        templateUrl: 'templates/user.html',
                        resolve: {
                            restrict: function(auth,AuthService) {
                                return AuthService.ensureActiveSubscription();
                            }
                        }
                    })
                    .state('dashboard.user.list', {
                        url: '/list',
                        controller: 'UserListCtrl as vm',
                        templateUrl: 'templates/user/list.html',
                        resolve: {
                            users: ['restrict','User', 'AuthService', function (restrict,User, AuthService) { //all users in this team, except myself
                                var currentTeam = AuthService.currentTeam();
                                return User.getAll({teamId: currentTeam._id});
                            }],
                            datasets: ['restrict','DatasetService', 'AuthService', function (restrict,DatasetService, AuthService) {
                                var user = AuthService.currentUser();
                                if (user.role == 'superAdmin' || user.role == 'admin') {
                                    return DatasetService.getDatasetsWithQuery({_team:user.defaultLoginTeam._id});
                                } else {
                                    return [];
                                }
                            }],
                        }
                    })
                    .state('dashboard.teams', {
                        url: '/teams',
                        controller: 'TeamCtrl as vm',
                        templateUrl: 'templates/teams.html',
                        resolve: {
                            restrict: function(auth,AuthService) {
                                return AuthService.ensureActiveSubscription();
                            }
                        }
                    });

                // use the HTML5 History API
            $locationProvider.html5Mode(true);
            $httpProvider.interceptors.push('TokenInterceptor');

        }
    ]);
