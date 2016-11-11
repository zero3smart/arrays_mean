// lazyload config

angular.module('arraysApp')
    /**
     * jQuery plugin config use ui-jq directive , config the js and css files that required
     * key: function name of the jQuery plugin
     * value: array of the css js file located
     */
    .constant('JQ_CONFIG', {
        }
    )
    .constant('MODULE_CONFIG', [
            {
                name:'dataSourceUpload',
                files: ['../../vendors/angular/angular-file-upload/dist/angular-file-upload.min.js']
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
