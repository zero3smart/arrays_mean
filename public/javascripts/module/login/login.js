var loginModule = angular.module('loginModule',['ui.router'])
loginModule.config(function($stateProvider,$urlRouterProvider,$locationProvider) {
	$urlRouterProvider.otherwise('/');

	$stateProvider
		.state('login', {
			url: '/login',
			templateUrl: 'templates/login.html'
		});

	 $('a').each(function(){
        $a = $(this);
        if ($a.is('[target]') || $a.is('[ng-href]')){

        } else {
            $a.attr('target', '_self');
        }
    });

    $locationProvider.html5Mode(true);
});


