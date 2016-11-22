(function() {
	angular.module('signupModule',['ui.router','ngMessages','ngResource','ngMaterial'])
		.config(function($stateProvider,$urlRouterProvider,$locationProvider) {

			$urlRouterProvider.otherwise('/signup/email');


			$stateProvider
				.state('signup', {
					abstract: true,
					url: '/signup',
					templateUrl: 'templates/signup.html'
				})

			$stateProvider
				.state('signup.email', {
					url: '/email',
					templateUrl: 'templates/blocks/signup.email.html',
					controller: 'mainCtrl'

				})
				.state('signup.info', {
					url: '/info/:id',
					templateUrl: 'templates/blocks/signup.info.html',
					controller: 'signupCtrl'
				})

				.state('signup.success',{
					url: '/success',
					params: {
						isInvite: null,
						id: null

					},
					templateUrl: 'templates/blocks/signup.success.html',
					controller: 'successCtrl'
				})

	    $locationProvider.html5Mode(true);
	});
})();




