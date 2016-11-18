(function() {
	angular.module('signupModule',['ui.router','ngMessages'])
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
				.state('signup.personalinfo', {
					url: '/personalinfo',
					templateUrl: 'templates/blocks/signup.personalinfo.html',
					controller: 'signupCtrl'
				})
				.state('signup.teaminfo',{
					url: '/teaminfo',
					templateUrl: 'templates/blocks/signup.teaminfo.html',
					controller: 'signupCtrl'
				})

	    $locationProvider.html5Mode(true);
	});
})();




