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
      files: ['Gruntfile.js', 'app/public/javascripts/**/*.js'],
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
        files : ['app/public/stylesheets/**/*.css', '!app/public/stylesheets/style.min.css'],
        options : {
          livereload : true
        },
        tasks: ['postcss']
      },
      sass: {
        files: ['app/public/stylesheets/scss/**/*.scss'],
        options: {
          livereload: true
        },
        tasks: ['sass', 'postcss']
      },
      js : {
        files : ['app/public/javascripts/**/*.js', '!app/public/javascripts/main.min.js', '!app/public/javascripts/lib/**/*.js'],
        // tasks : ['jshint'],
        options : {
          livereload : true
        }
      },
      html : {
        files : ['app/views/**/*.html'],
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
        dest: 'app/public/javascripts/lib/d3'
      },
      worldGeoJson: {
        expand: true,
        cwd: 'bower_components/world.geo.json',
        src: 'countries.geo.json',
        dest: 'app/public/data/world.geo.json'
      },
      sharrre: {
        expand: true,
        cwd: 'bower_components/sharrre',
        src: 'jquery.sharrre.js',
        dest: 'app/public/javascripts/lib/sharrre'
      },
      scrollmagic: {
        expand: true,
        cwd: 'bower_components/scrollmagic/scrollmagic/uncompressed',
        src: 'ScrollMagic.js',
        dest: 'app/public/javascripts/lib/scrollmagic'
      },
      lodash: {
        expand: true,
        cwd: 'bower_components/lodash/dist/',
        src: '*',
        dest: 'app/public/javascripts/lib/lodash'
      },
      moment: {
        expand: true,
        cwd: 'bower_components/moment',
        src: 'moment.js',
        dest: 'app/public/javascripts/lib/moment'
      },
      colorpickerJs: {
        expand: true,
        cwd: 'bower_components/bootstrap-colorpicker/dist/js',
        src: '**',
        dest: 'app/public/javascripts/lib/colorpicker/'
      },
      colorpickerImg: {
        expand: true,
        cwd: 'bower_components/bootstrap-colorpicker/dist/img',
        src: '**',
        dest: 'app/public/images/lib/'
      },
      colorpickerCss: {
        expand: true,
        cwd: 'bower_components/bootstrap-colorpicker/dist/css',
        src: '**',
        dest: 'app/public/stylesheets/lib/bootstrap-colorpicker'
      },
    },

    sass: {
      bootstrap: {
        options: {
          // sourceMap: true
        },
        files: {
          'app/public/stylesheets/base/bootstrap.css': 'app/public/stylesheets/scss/bootstrap.scss'
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
        src: 'app/public/stylesheets/style.css',
        dest: 'app/public/stylesheets/style.min.css'
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