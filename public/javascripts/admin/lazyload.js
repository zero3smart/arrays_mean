// lazyload config

angular.module('arraysApp')
    .constant('MODULE_CONFIG', [
            {
                name:'dataSourceUpload',
                files: ['../../vendors/angular-file-upload/dist/angular-file-upload.min.js']
            }
        ]
    )
    // oclazyload config
    .config(['$ocLazyLoadProvider', 'MODULE_CONFIG', function($ocLazyLoadProvider, MODULE_CONFIG) {
        // We configure ocLazyLoad to use the lib script.js as the async loader
        $ocLazyLoadProvider.config({
            debug:  false,
            events: true,
            modules: MODULE_CONFIG
        });
    }])
;
