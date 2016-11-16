(function() {
	angular.module('signupModule',['ui.router','ngMessages'])
		.run(['$rootScope','$location','$window',function($rootScope, $location,$window) {
			$rootScope.$on('$locationChangeSuccess',function() {
				$rootScope.actualLocation = $location.path();
			})
			$rootScope.$watch(function() {return $location.path()},function(newLocation,oldLocation) {

				if ($rootScope.actualLocation == newLocation && oldLocation=='/login') {
					$window.location.href=newLocation;
				}
			})

		}])
		.config(function($stateProvider,$urlRouterProvider,$locationProvider) {
			// $urlRouterProvider.otherwise('/');

			$stateProvider
				.state('signup', {
					url: '/auth/signup',
					templateUrl: 'templates/blocks/signup.email.html',
					controller: 'signupCtrl'

				})
				.state('personal_info', {
					url: 'auth/signup/personalinfo',
					params: {
						user: null
					},
					templateUrl: 'templates/blocks/signup.personalinfo.html',
					controller: 'signupCtrl'
				})
				.state('team_info',{
					url: 'auth/signup/teaminfo',
					params : {
						user: null
					},
					templateUrl: 'templates/blocks/signup.team.html',
					controller: 'signupCtrl'
				})


		 // $('a').each(function(){
	  //       $a = $(this);
	  //       if ($a.is('[target]') || $a.is('[ng-href]')){

	  //       } else {
	  //           $a.attr('target', '_self');
	  //       }
	  //   });

	    $locationProvider.html5Mode(true);
	});
})();




