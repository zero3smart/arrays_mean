/*global module:false*/
module.exports = function(grunt) {

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
      css : {
        files : ['public/stylesheets/**/*.css', '!public/stylesheets/style.min.css'],
        options : {
          livereload : true
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
      js : {
        files : ['public/javascripts/**/*.js', '!public/javascripts/main.min.js', '!public/javascripts/venders/**/*.js'],
        // tasks : ['jshint'],
        options : {
          livereload : true
        }
      },
      html : {
        files : ['views/**/*.html'],
        options : {
          livereload : true
        }
      }

      // lib_test: {
      //   files: '<%= jshint.lib_test.src %>',
      //   tasks: ['jshint:lib_test', 'nodeunit']
      // }
    },

    // Copy assets from bower_components to public folder
    copy: {
      d3: {
        expand: true,
        cwd: 'bower_components/d3',
        src: 'd3.js',
        dest: 'public/javascripts/venders/d3'
      },
      worldGeoJson: {
        expand: true,
        cwd: 'bower_components/world.geo.json',
        src: 'countries.geo.json',
        dest: 'public/data/world.geo.json'
      },
      sharrre: {
        expand: true,
        cwd: 'bower_components/sharrre',
        src: 'jquery.sharrre.js',
        dest: 'public/javascripts/venders/sharrre'
      },
      scrollmagic: {
        expand: true,
        cwd: 'bower_components/scrollmagic/scrollmagic/uncompressed',
        src: 'ScrollMagic.js',
        dest: 'public/javascripts/venders/scrollmagic'
      },
      lodash: {
        expand: true,
        cwd: 'bower_components/lodash/dist/',
        src: '*',
        dest: 'public/javascripts/venders/lodash'
      },
      moment: {
        expand: true,
        cwd: 'bower_components/moment',
        src: 'moment.js',
        dest: 'public/javascripts/venders/moment'
      },
      colorpickerJs: {
        expand: true,
        cwd: 'bower_components/bootstrap-colorpicker/dist/js',
        src: '**',
        dest: 'public/javascripts/venders/colorpicker/'
      },
      colorpickerImg: {
        expand: true,
        cwd: 'bower_components/bootstrap-colorpicker/dist/img',
        src: '**',
        dest: 'public/images/lib/'
      },
      /* colorpickerCss: {
        expand: true,
        cwd: 'bower_components/bootstrap-colorpicker/dist/css',
        src: '**',
        dest: 'public/stylesheets/lib/bootstrap-colorpicker'
      }, */
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