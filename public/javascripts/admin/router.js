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
        ['$stateProvider', '$urlRouterProvider', '$locationProvider', 'MODULE_CONFIG',
            function ($stateProvider, $urlRouterProvider, $locationProvider, MODULE_CONFIG) {

                $urlRouterProvider
                    .otherwise('/admin/account');

                $stateProvider
                    .state('admin', {
                        abstract: true,
                        url: '/admin',
                        templateUrl: "templates/admin.html"
                    })
                    .state('admin.account', {
                        url: '/account',
                        templateUrl: 'templates/account.html',
                    })
                    .state('admin.dataset', {
                        url: '/dataset',
                        templateUrl: 'templates/index.html'
                    })
                    .state('admin.dataset.settings', {
                        url: '/settings',
                        templateUrl: 'templates/dataset/settings.html'
                    })
                    .state('admin.dataset.upload', {
                        url: '/upload',
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
                    });

                // use the HTML5 History API
                $locationProvider.html5Mode(true);

            }
        ]);