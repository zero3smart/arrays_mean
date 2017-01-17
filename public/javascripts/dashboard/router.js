'use strict';

angular.module('arraysApp')
    .run(
        ['$rootScope', '$state', '$stateParams',
            function ($rootScope, $state, $stateParams) {
                $rootScope.$state = $state;
                $rootScope.$stateParams = $stateParams;

                $rootScope.$on('$stateChangeError',function(event, toState,toParams,fromState,fromParams,error) {
                    event.preventDefault();
                    console.log(error);
                    if (error.importing == true) {
                        $state.go('dashboard.dataset.done', {id: error.datasetId});
                    }
                })
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
                        templateUrl: "templates/dashboard.html",
                        controller: "AdminCtrl",
                        resolve: {
                            auth: function (AuthService) {
                                return AuthService.ensureLogIn();
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
                    .state('dashboard.account.billing', {
                        url: '/billing',
                        controller: 'BillingCtrl',
                        templateUrl: 'templates/account/billing.html'
                    })
                    .state('dashboard.account.payment', {
                        url: '/payment',
                        controller: 'BillingCtrl',
                        templateUrl: 'templates/account/payment.html'
                    })
                    .state('dashboard.account.upgradeEnterprise', {
                        url: '/upgrade/enterprise',
                        controller: 'BillingCtrl',
                        templateUrl: 'templates/account/upgrade.enterprise.html'
                    })
                    .state('dashboard.account.upgradePro', {
                        url: '/upgrade/pro',
                        controller: 'BillingCtrl',
                        templateUrl: 'templates/account/upgrade.pro.html'
                    })
                    .state('dashboard.account.close', {
                        url: '/close',
                        controller: 'BillingCtrl',
                        templateUrl: 'templates/account/close.html'
                    })
                    //
                    .state('dashboard.dataset', {
                        abstract: true,
                        url: '/dataset',
                        templateUrl: 'templates/dataset.html',
                        controller: 'DatasetCtrl'
                    })
                    .state('dashboard.dataset.list', {
                        url: '/list',
                        templateUrl: 'templates/dataset/list.html',
                        controller: 'DatasetListCtrl',
                        resolve: {
                            datasets: ['DatasetService', 'AuthService', function (DatasetService, AuthService) {
                                var user = AuthService.currentUser();
                                if (user.role == 'superAdmin' || user.role == 'admin') {
                                    return DatasetService.getDatasetsWithQuery({_team:user.defaultLoginTeam._id});
                                } else if (user.role == 'editor') {
                                    return DatasetService.getDatasetsWithQuery({_id: {$in: user._editors}, _team:user.defaultLoginTeam._id});
                                } else {
                                    return [];
                                }
                            }]
                        }
                    })
                    .state('dashboard.dataset.settings', {
                        url: '/settings/:id',
                        controller: 'DatasetSettingsCtrl',
                        templateUrl: 'templates/dataset/settings.html',
                        resolve: {
                            dataset: ['DatasetService', '$stateParams','$q', function (DatasetService, $stateParams,$q) {

                                // return DatasetService.get($stateParams.id);

                                if ($stateParams.id) {
                                    var deferred = $q.defer();
                                    DatasetService.get($stateParams.id)
                                    .then(function(data) {
                                        if (data.jobId !== 0) {
                                            deferred.reject({importing: true, datasetId: data._id});
                                        } else {
                                            deferred.resolve(data);
                                        }
                                        
                                    })
                                    return deferred.promise;

                                } else {
                                    return {urls: []};
                                }


                           

                                
                            }]
                        }
                    })
                    .state('dashboard.dataset.upload', {
                        url: '/upload/:id',
                        templateUrl: 'templates/dataset/upload.html',
                        controller: 'DatasetUploadCtrl',
                        resolve: {
                            dataset: ['DatasetService', '$stateParams', function (DatasetService, $stateParams) {
                                return DatasetService.get($stateParams.id);
                            }],
                            additionalDatasources: ['DatasetService', '$stateParams', function (DatasetService, $stateParams) {
                                if ($stateParams.id)
                                    return DatasetService.getAdditionalSources($stateParams.id);
                                else
                                    return [];
                            }]
                        }
                    })
                    .state('dashboard.dataset.data', {
                        url: '/data/:id',
                        templateUrl: 'templates/dataset/data.html',
                        controller: 'DatasetDataCtrl as vm',
                        resolve: {
                            dataset: ['DatasetService', '$stateParams', function (DatasetService, $stateParams) {
                                return DatasetService.get($stateParams.id);
                            }],
                            additionalDatasources: ['DatasetService', '$stateParams', function (DatasetService, $stateParams) {
                                return DatasetService.getAdditionalSources($stateParams.id);
                            }],
                            availableTypeCoercions: ['DatasetService', function (DatasetService) {
                                return DatasetService.getAvailableTypeCoercions();
                            }],
                            availableDesignatedFields: ['DatasetService', function (DatasetService) {
                                return DatasetService.getAvailableDesignatedFields();
                            }]
                        }
                    })
                    .state('dashboard.dataset.views', {
                        url: '/views/:id',
                        templateUrl: 'templates/dataset/views.html',
                        controller: 'DatasetViewsCtrl as vm',
                        resolve: {
                            dataset: ['DatasetService', '$stateParams', function (DatasetService, $stateParams) {

                                return DatasetService.get($stateParams.id);
                            }],
                            viewResource: 'View',
                            views: ['View', function (View) {
                                return View.query().$promise;
                            }]
                        }
                    })
                    .state('dashboard.dataset.done', {
                        url: '/done/:id',
                        templateUrl: 'templates/dataset/done.html',
                        controller: 'DatasetDoneCtrl',
                        resolve: {
                            dataset: ['DatasetService', '$stateParams', function (DatasetService, $stateParams) {
                                return DatasetService.get($stateParams.id);
                            }],
                            additionalDatasources: ['DatasetService', '$stateParams', function (DatasetService, $stateParams) {
                                return DatasetService.getAdditionalSources($stateParams.id);
                            }]
                        }
                    })
                    .state('dashboard.team', {
                        url: '/team',
                        controller: 'WebsiteCtrl as vm',
                        templateUrl: 'templates/team.html'
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
                        templateUrl: 'templates/user.html'
                    })
                    .state('dashboard.user.list', {
                        url: '/list',
                        controller: 'UserListCtrl as vm',
                        templateUrl: 'templates/user/list.html',
                        resolve: {
                            users: ['User', 'AuthService', function (User, AuthService) { //all users in this team, except myself
                                var currentTeam = AuthService.currentTeam();
                                return User.getAll({teamId: currentTeam._id});
                            }],
                            datasets: ['DatasetService', 'AuthService', function (DatasetService, AuthService) {
                                var user = AuthService.currentUser();
                                if (user.role == 'superAdmin' || user.role == 'admin') {
                                    return DatasetService.getDatasetsWithQuery({_team:user.defaultLoginTeam._id})
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
                    });

                // use the HTML5 History API
                $locationProvider.html5Mode(true);
                $httpProvider.interceptors.push('TokenInterceptor');

            }
        ]);
