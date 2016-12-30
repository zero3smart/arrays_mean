'use strict';

angular
    .module('arraysApp', [
        'ui.router',
        'ui.bootstrap',
        'ngMaterial',
        'ngMessages',
        'ngStorage',
        'ngResource',
        'ngCookies',
        'mdColorPicker',
        'angularFileUpload',
        'ui.sortable'
    ])
    .config(["$mdThemingProvider", function($mdThemingProvider) {
        $mdThemingProvider.definePalette('arraysPalette', {
            '50': '#feb600',
            '100': '#feb600',
            '200': '#feb600',
            '300': '#feb600',
            '400': '#feb600',
            '500': '#feb600',
            '600': '#feb600',
            '700': '#feb600',
            '800': '#feb600',
            '900': '#feb600',
            'A100': '#feb600',
            'A200': '#feb600',
            'A400': '#feb600',
            'A700': '#feb600'
        });
        $mdThemingProvider.theme('default')
            .accentPalette('arraysPalette');
    }]);
