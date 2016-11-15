/*global module:false*/
module.exports = function (grunt) {

    // Project configuration.
    grunt.initConfig({
        // Metadata.
        pkg: grunt.file.readJSON('package.json'),
        banner: '/*! <%= pkg.title || pkg.name %> - v<%= pkg.version %> - ' +
        '<%= grunt.template.today("yyyy-mm-dd") %>\n' +
        '<%= pkg.homepage ? "* " + pkg.homepage + "\\n" : "" %>' +
        '* Copyright (c) <%= grunt.template.today("yyyy") %> <%= pkg.author.name %>;' +
        ' Licensed <%= _.pluck(pkg.licenses, "type").join(", ") %> */\n',
        // Task configuration.
        // concat: {
        //   options: {
        //     banner: '<%= banner %>',
        //     stripBanners: true
        //   },
        //   dist: {
        //     src: ['lib/<%= pkg.name %>.js'],
        //     dest: 'dist/<%= pkg.name %>.js'
        //   }
        // },
        // uglify: {
        //   options: {
        //     banner: '<%= banner %>'
        //   },
        //   dist: {
        //     src: '<%= concat.dist.dest %>',
        //     dest: 'dist/<%= pkg.name %>.min.js'
        //   }
        // },

        jshint: {
            files: ['Gruntfile.js', 'public/javascripts/**/*.js'],
            options: {
                // curly: true,
                // eqeqeq: true,
                // immed: true,
                // latedef: true,
                // newcap: true,
                // noarg: true,
                // sub: true,
                // undef: true,
                // unused: true,
                // boss: true,
                // eqnull: true,
                // globals: {
                //   jQuery: true
                // }
            },
            gruntfile: {
                src: 'Gruntfile.js'
            },
            // lib_test: {
            //   src: ['lib/**/*.js', 'test/**/*.js']
            // }
        },

        // nodeunit: {
        //   files: ['test/**/*_test.js']
        // },

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
            sass: {
                files: ['public/stylesheets/scss/**/*.scss'],
                options: {
                    livereload: true
                },
                tasks: ['sass', 'postcss']
            },
            js: {
                files: ['public/javascripts/**/*.js', '!public/javascripts/main.min.js', '!public/javascripts/vendors/**/*.js'],
                // tasks : ['jshint'],
                options: {
                    livereload: true
                }
            },
            html: {
                files: ['views/**/*.html'],
                options: {
                    livereload: true
                }
            }

            // lib_test: {
            //   files: '<%= jshint.lib_test.src %>',
            //   tasks: ['jshint:lib_test', 'nodeunit']
            // }
        },

        // Copy assets from bower_components to public folder
        copy: {
            libs: {
                expand: true,
                cwd: 'bower_components',
                src: [
                    'd3/d3.js',
                    'sharrre/jquery.sharrre.js',
                    'scrollmagic/scrollmagic/uncompressed/ScrollMagic.js',
                    'lodash/dist/**',
                    'moment/moment.js',
                    'bootstrap-colorpicker/dist/**',
                    'angular/angular.js',
                    'angular-file-upload/dist/angular-file-upload.min.js',
                    'angular-animate/angular-animate.min.js',
                    'angular-cookies/angular-cookies.min.js',
                    'angular-ui-router/release/angular-ui-router.min.js',
                    'angular-bootstrap/ui-bootstrap-tpls.js',
                    'ngstorage/ngStorage.min.js',
                    'oclazyload/dist/**',
                    'angular-material/**',
                    'angular-aria/angular-aria.min.js',
                    'angular-messages/angular-messages.min.js'
                ],
                dest: 'public/javascripts/vendors'
            },
            data: {
                expand: true,
                cwd: 'bower_components',
                src: [
                    'world.geo.json/countries.geo.json'
                ],
                dest: 'public/data'
            }
        },

        sass: {
            bootstrap: {
                options: {
                    // sourceMap: true
                },
                files: {
                    'public/stylesheets/base/bootstrap.css': 'public/stylesheets/scss/bootstrap.scss'
                }
            }
        },

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
        },
    });

    // These plugins provide necessary tasks.
    // grunt.loadNpmTasks('grunt-contrib-concat');
    // grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-sass');
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-postcss');

    // Default task.
    grunt.registerTask('default', ['jshint']);
    grunt.registerTask('build', ['copy', 'sass', 'postcss']);

};