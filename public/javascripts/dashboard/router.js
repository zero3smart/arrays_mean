'use strict';

angular.module('arraysApp')
    .run(
        ['$rootScope', '$state', '$stateParams',
            function ($rootScope, $state, $stateParams) {
                $rootScope.$state = $state;
                $rootScope.$stateParams = $stateParams;
            }
        ]
    )
    .config(
        ['$stateProvider', '$urlRouterProvider', '$locationProvider','$httpProvider',
            function ($stateProvider, $urlRouterProvider, $locationProvider,$httpProvider) {

                $urlRouterProvider
                    .otherwise('/dashboard/account');

                $stateProvider
                    .state('dashboard', {
                        abstract: true,
                        url: '/dashboard',
                        templateUrl: "templates/dashboard.html",
                        controller: "AdminCtrl",
                        resolve: {
                            auth : function(AuthService) {
                                return AuthService.ensureLogIn();
                            }
                        }
                    })
                    .state('dashboard.account', {
                        url: '/account',
                        controller: 'AccountCtrl',
                        templateUrl: 'templates/account.html',

                    })
                    .state('dashboard.dataset', {
                        abstract: true,
                        url: '/dataset',
                        templateUrl: 'templates/dataset.html'
                    })
                    .state('dashboard.dataset.list', {
                        url: '/list',
                        templateUrl: 'templates/dataset/list.html',
                        controller: 'DatasetListCtrl',
                        resolve: {
                            datasets: ['DatasetService', function(DatasetService) {
                                return DatasetService.getAll();
                            }]
                        }
                    })
                    .state('dashboard.dataset.settings', {
                        url: '/settings/:id',
                        controller: 'DatasetSettingsCtrl',
                        templateUrl: 'templates/dataset/settings.html',
                        resolve: {
                            dataset: ['DatasetService', '$stateParams', function(DatasetService, $stateParams) {
                                return DatasetService.get($stateParams.id);
                            }]
                        }
                    })
                    .state('dashboard.dataset.upload', {
                        url: '/upload/:id',
                        templateUrl: 'templates/dataset/upload.html',
                        controller: 'DatasetUploadCtrl',
                        resolve: {
                            dataset: ['DatasetService', '$stateParams', function(DatasetService, $stateParams) {
                                return DatasetService.get($stateParams.id);
                            }],
                            sources: ['DatasetService', '$stateParams', function(DatasetService, $stateParams) {
                                if ($stateParams.id)
                                    return DatasetService.getSources($stateParams.id);
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
                            dataset: ['DatasetService', '$stateParams', function(DatasetService, $stateParams) {
                                return DatasetService.get($stateParams.id);
                            }],
                            availableTypeCoercions: ['DatasetService', function(DatasetService) {
                                return DatasetService.getAvailableTypeCoercions();
                            }],
                            availableDesignatedFields: ['DatasetService', function(DatasetService) {
                                return DatasetService.getAvailableDesignatedFields();
                            }]
                        }
                    })
                    .state('dashboard.dataset.views', {
                        url: '/views/:id',
                        templateUrl: 'templates/dataset/views.html',
                        controller: 'DatasetViewsCtrl as vm',
                        resolve: {
                            dataset: ['DatasetService', '$stateParams', function(DatasetService, $stateParams) {

                                return DatasetService.get($stateParams.id);
                            }],
                            viewResource: 'View',
                            views: ['View',function(View) {

                                return View.query();
                            }]
                        }
                    })
                    .state('dashboard.dataset.done', {
                        url: '/done/:id',
                        templateUrl: 'templates/dataset/done.html',
                        controller: 'DatasetDoneCtrl',
                        resolve: {
                            dataset: ['DatasetService', '$stateParams', function(DatasetService, $stateParams) {
                                return DatasetService.get($stateParams.id);
                            }]
                        }
                    })
                    .state('dashboard.website', {
                        url: '/website',
                        templateUrl: 'templates/website.html'
                    })
                    .state('dashboard.users', {
                        url: '/users',
                        templateUrl: 'templates/users.html'
                    })
                    .state('login', {
                        url: '/login',
                        templateUrl: 'templates/login.html'
                    });

                // use the HTML5 History API
                $locationProvider.html5Mode(true);
                $httpProvider.interceptors.push('TokenInterceptor');

            }
        ]);