/*global module:false*/
module.exports = function (grunt) {

    // Project configuration.
    grunt.initConfig({

        subgrunt: {
            custom: {
                options: {
                    npmInstall: true
                },
                projects: {
                    'user/*/': ['build']
                }
            }

        },
        // Metadata.
        pkg: grunt.file.readJSON('package.json'),
        banner: '/*! <%= pkg.title || pkg.name %> - v<%= pkg.version %> - ' +
        '<%= grunt.template.today("yyyy-mm-dd") %>\n' +
        '<%= pkg.homepage ? "* " + pkg.homepage + "\\n" : "" %>' +
        '* Copyright (c) <%= grunt.template.today("yyyy") %> <%= pkg.author.name %>;' +
        ' Licensed <%= _.pluck(pkg.licenses, "type").join(", ") %> */\n',

        jshint: {
            files: ['Gruntfile.js', 'public/javascripts/**/*.js'],
            gruntfile: {
                src: 'Gruntfile.js'
            }
        },

        watch: {
            gruntfile: {
                files: '<%= jshint.gruntfile.src %>',
                tasks: ['jshint:gruntfile', 'postcss']
            },
            css: {
                files: ['public/stylesheets/**/*.css', '!public/stylesheets/style.min.css'],
                options: {
                    livereload: true
                },
                tasks: ['postcss']
            },
            js: {
                files: ['public/javascripts/**/*.js', '!public/javascripts/main.min.js', '!public/vendors/**/*.js'],
                options: {
                    livereload: true
                }
            },
            html: {
                files: ['views/**/*.html', 'public/templates/*.html', 'public/templates/**/*.html'],
                options: {
                    livereload: true
                }
            }
        },

        // Copy assets from bower_components to public folder
        copy: {
            vendors: {
                expand: true,
                cwd: 'bower_components',
                src: [
                    'jquery/dist/jquery.min.js',
                    'd3/d3.js',
                    'sharrre/jquery.sharrre.min.js',
                    'scrollmagic/scrollmagic/minified/ScrollMagic.min.js',
                    'urijs/src/URI.min.js',
                    'lodash/dist/**',
                    'moment/moment.js',
                    'angular/angular.js',
                    'angular-resource/angular-resource.min.js',
                    'angular-file-upload/dist/angular-file-upload.min.js',
                    'angular-animate/angular-animate.min.js',
                    'angular-cookies/angular-cookies.min.js',
                    'angular-ui-router/release/angular-ui-router.min.js',
                    'angular-bootstrap/ui-bootstrap-tpls.js',
                    'ngstorage/ngStorage.min.js',
                    'oclazyload/dist/ocLazyLoad.min.js',
                    'angular-material/angular-material.min.js',
                    'angular-material/angular-material.min.css',
                    'angular-aria/angular-aria.min.js',
                    'angular-messages/angular-messages.min.js',
                    'tinycolor/dist/tinycolor-min.js',
                    'md-color-picker/dist/*',
                    'angular-ui-sortable/sortable.min.js',
                    'jquery-ui/jquery-ui.min.js',
                    'threejs/build/three.min.js',
                    'tweenjs/src/Tween.js',
                    'bootstrap/dist/js/bootstrap.min.js'
                ],
                dest: 'public/vendors'
            }
        },



        // sass: {
        //     bootstrap: {
        //         files: {
        //             'public/stylesheets/base/bootstrap.css': 'public/stylesheets/scss/bootstrap.scss'
        //         }
        //     }
        // },


        postcss: {
            options: {
                map: true,
                processors: [
                    require('postcss-import')({
                        path: ["resources"]
                    }),
                    require('postcss-custom-properties')({
                        //
                    }),
                    require('autoprefixer')({
                        browsers: ['> 1%', 'IE 9', 'IE 10', 'IE 11'],
                        remove: false
                    }),
                    require('cssnano')({
                        autoprefixer: false,
                        reduceTransforms: false,
                        discardUnused: false,
                        zindex: false
                    })
                ]
            },
            dist: {
                src: 'public/stylesheets/style.css',
                dest: 'public/stylesheets/style.min.css'
            }
        }
    });

    // These plugins provide necessary tasks.
    // grunt.loadNpmTasks('grunt-contrib-concat');
    // grunt.loadNpmTasks('grunt-contrib-uglify');

    // grunt.loadNpmTasks('grunt-contrib-sass');

    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-postcss');

    // custom task
    grunt.loadTasks('grunt-subgrunt');

    // Default task.
    grunt.registerTask('default', ['jshint']);

    grunt.registerTask('build', ['copy', 'postcss', 'subgrunt']);

};
