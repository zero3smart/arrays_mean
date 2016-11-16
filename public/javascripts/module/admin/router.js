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

                // $urlRouterProvider
                //     .otherwise('/admin/account');

                $stateProvider
                    // .state('admin', {
                    //     abstract: true,
                    //     url: '/admin',
                    //     templateUrl: "templates/admin.html"
                    // })
                    .state('admin.account', {
                        url: '/account',
                        templateUrl: 'templates/account.html',
                        resolve: load(['javascripts/module/admin/controllers/account.js'])
                    })
                    .state('admin.dataset', {
                        url: '/dataset',
                        templateUrl: 'templates/dataset.html',
                        resolve: load([
                            'javascripts/module/admin/services/dataset.js',
                            'javascripts/module/admin/controllers/dataset.js'
                        ])
                    })
                    .state('admin.dataset.settings', {
                        url: '/settings',
                        templateUrl: 'templates/dataset.settings.html',
                        resolve: load(['javascripts/module/admin/controllers/dataset/settings.js'])
                    })
                    .state('admin.dataset.upload', {
                        url: '/upload',
                        templateUrl: 'templates/dataset.upload.html',
                        resolve: load(['javascripts/module/admin/controllers/dataset/upload.js'])
                    })
                    .state('admin.dataset.data', {
                        url: '/data',
                        templateUrl: 'templates/dataset.data.html',
                        resolve: load(['javascripts/module/admin/controllers/dataset/data.js'])
                    })
                    .state('admin.dataset.views', {
                        url: '/views',
                        templateUrl: 'templates/dataset.views.html',
                        resolve: load(['javascripts/module/admin/controllers/dataset/views.js'])
                    })
                    .state('admin.dataset.done', {
                        url: '/done',
                        templateUrl: 'templates/dataset.done.html'
                    })
                    .state('admin.website', {
                        url: '/website',
                        templateUrl: 'templates/website.html'
                    })
                    .state('admin.users', {
                        url: '/users',
                        templateUrl: 'templates/users.html'
                    });

                function load(srcs, callback) {
                    return {
                        deps: ['$ocLazyLoad', '$q',
                            function ($ocLazyLoad, $q) {
                                var deferred = $q.defer();
                                var promise = false;
                                srcs = angular.isArray(srcs) ? srcs : srcs.split(/\s+/);
                                if (!promise) {
                                    promise = deferred.promise;
                                }
                                angular.forEach(srcs, function (src) {
                                    promise = promise.then(function () {
                                        angular.forEach(MODULE_CONFIG, function (module) {
                                            if (module.name == src) {
                                                name = module.name;
                                            } else {
                                                name = src;
                                            }
                                        });
                                        return $ocLazyLoad.load(name);
                                    });
                                });
                                deferred.resolve();
                                return callback ? promise.then(callback) : promise;
                            }]
                    }
                }

                // use the HTML5 History API
                $locationProvider.html5Mode(true);

            }
        ]);