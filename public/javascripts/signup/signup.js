(function() {
	angular.module('signupModule',['ui.router','ngMessages','ngResource','ngMaterial'])
		.config(function($stateProvider,$urlRouterProvider,$locationProvider) {

			$urlRouterProvider
				.when('/reset','/reset/email')
				.when('/signup','/signup/email')


			$stateProvider
				.state('signup', {
					abstract: true,
					url: '/signup',
					templateUrl: 'templates/signup.html'
				})

				.state('reset', {
					abstract: true,
					url: '/reset',
					templateUrl: 'templates/signup.html'
				})



			$stateProvider

				.state('reset.email',{
					url: '/email',
					templateUrl:'templates/blocks/reset.email.html',
					controller: 'passwordCtrl'
				})
				.state('reset.password',{
					url: '/password?userId&err&msg',
					templateUrl:'templates/blocks/reset.password.html',
					controller: 'passwordCtrl'
				})
				.state('signup.email', {
					url: '/email',
					templateUrl: 'templates/blocks/signup.email.html',
					controller: 'mainCtrl'

				})
				.state('signup.info', {
					url: '/info/:id',
					templateUrl: 'templates/blocks/signup.info.html',
					controller: 'signupCtrl',
					resolve: {
						env: function(ENV) {
							return ENV.get();
						}
					}
				})

				.state('signup.success',{
					url: '/success/:id',
					params: {
						isInvite: null
					},
					templateUrl: 'templates/blocks/signup.success.html',
					controller: 'successCtrl'
				})
				.state('signup.error',{
					url: '/error?name&msg',
					templateUrl:'templates/blocks/signup.error.html',
					controller: 'errorCtrl'
				})





	    $locationProvider.html5Mode(true);
	});
})();




