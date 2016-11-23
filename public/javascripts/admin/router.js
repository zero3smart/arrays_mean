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
        ['$stateProvider', '$urlRouterProvider', '$locationProvider',
            function ($stateProvider, $urlRouterProvider, $locationProvider) {

                $urlRouterProvider
                    .otherwise('/admin/dataset/list');

                $stateProvider
                    .state('admin', {
                        abstract: true,
                        url: '/admin',
                        templateUrl: "templates/admin.html",
                        resolve: {
                            auth: function(AuthService) {
                                /* return AuthService.ensureLogin(); */
                                return true;
                            }
                        }
                    })
                    .state('admin.account', {
                        url: '/account',
                        controller: 'AccountCtrl',
                        templateUrl: 'templates/account.html',
                    })
                    .state('admin.dataset', {
                        abstract: true,
                        url: '/dataset',
                        templateUrl: 'templates/dataset.html'
                    })
                    .state('admin.dataset.list', {
                        url: '/list',
                        templateUrl: 'templates/dataset/list.html',
                        controller: 'DatasetListCtrl',
                        resolve: {
                            datasets: ['DatasetService', function(DatasetService) {
                                return DatasetService.getAll();
                            }]
                        }
                    })
                    .state('admin.dataset.settings', {
                        url: '/settings/:id',
                        controller: 'DatasetSettingsCtrl',
                        templateUrl: 'templates/dataset/settings.html',
                        resolve: {
                            dataset: ['DatasetService', '$stateParams', function(DatasetService, $stateParams) {
                                return DatasetService.get($stateParams.id);
                            }]
                        }
                    })
                    .state('admin.dataset.upload', {
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
                    .state('admin.dataset.data', {
                        url: '/data/:id',
                        templateUrl: 'templates/dataset/data.html',
                        controller: 'DatasetDataCtrl',
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
                    .state('admin.dataset.views', {
                        url: '/views/:id',
                        templateUrl: 'templates/dataset/views.html',
                        controller: 'DatasetViewsCtrl',
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
                    .state('admin.dataset.done', {
                        url: '/done/:id',
                        templateUrl: 'templates/dataset/done.html',
                        controller: 'DatasetDoneCtrl',
                        resolve: {
                            dataset: ['DatasetService', '$stateParams', function(DatasetService, $stateParams) {
                                return DatasetService.get($stateParams.id);
                            }]
                        }
                    })
                    .state('admin.website', {
                        url: '/website',
                        templateUrl: 'templates/website.html'
                    })
                    .state('admin.users', {
                        url: '/users',
                        templateUrl: 'templates/users.html'
                    })
                    .state('login', {
                        url: '/login',
                        templateUrl: 'templates/login.html'
                    });

                // use the HTML5 History API
                $locationProvider.html5Mode(true);

            }
        ]);