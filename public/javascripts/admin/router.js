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
                    .otherwise('/admin/dataset');

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
                                return DatasetService.GetAll();
                            }]
                        }
                    })
                    .state('admin.dataset.settings', {
                        url: '/settings/:datasetId',
                        templateUrl: 'templates/dataset/settings.html'
                    })
                    .state('admin.dataset.upload', {
                        url: '/upload/:datatsetId',
                        templateUrl: 'templates/dataset/upload.html',
                    })
                    .state('admin.dataset.data', {
                        url: '/data',
                        templateUrl: 'templates/dataset/data.html',
                    })
                    .state('admin.dataset.views', {
                        url: '/views',
                        templateUrl: 'templates/dataset/views.html',
                    })
                    .state('admin.dataset.done', {
                        url: '/done',
                        templateUrl: 'templates/dataset/done.html'
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