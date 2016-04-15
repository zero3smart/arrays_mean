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
      files: ['Gruntfile.js', 'local_modules/app/public/javascripts/**/*.js'],
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
        tasks: ['jshint:gruntfile']
      },
      css : {
        files : ['local_modules/app/public/stylesheets/**/*.css', '!local_modules/app/public/stylesheets/style.min.css'],
        options : {
          livereload : true
        },
        tasks: ['postcss']
      },
      sass: {
        files: ['local_modules/app/public/stylesheets/scss/**/*.scss'],
        options: {
          livereload: true
        },
        tasks: ['sass', 'postcss']
      },
      js : {
        files : ['local_modules/app/public/javascripts/**/*.js', '!local_modules/app/public/javascripts/main.min.js', '!local_modules/app/public/javascripts/lib/**/*.js'],
        // tasks : ['jshint'],
        options : {
          livereload : true
        }
      },
      html : {
        files : ['local_modules/app/views/**/*.html'],
        options : {
          livereload : true
        }
      }

      // lib_test: {
      //   files: '<%= jshint.lib_test.src %>',
      //   tasks: ['jshint:lib_test', 'nodeunit']
      // }
    },

    // Copy assets
    copy: {
      arraysSplash: {
        expand: true,
        cwd: 'bower_components/arrays-splash/dist/',
        src: '**',
        dest: 'local_modules/app/public/splash/'
      },
      d3: {
        expand: true,
        cwd: 'bower_components/d3',
        src: 'd3.js',
        dest: 'local_modules/app/public/javascripts/lib/d3'
      },
      nvd3js: {
        expand: true,
        cwd: 'bower_components/nvd3/build',
        src: 'nv.d3.js',
        dest: 'local_modules/app/public/javascripts/lib/nvd3'
      },
      nvd3css: {
        expand: true,
        cwd: 'bower_components/nvd3/build',
        src: 'nv.d3.css',
        dest: 'local_modules/app/public/stylesheets/lib/nvd3'
      },
      mapboxjs: {
        expand: true,
        cwd: 'bower_components/mapbox-gl-js',
        src: 'mapbox-gl.js',
        dest: 'local_modules/app/public/javascripts/lib/mapbox-gl-js'
      },
      mapboxcss: {
        expand: true,
        cwd: 'bower_components/mapbox-gl-js',
        src: 'mapbox-gl.css',
        dest: 'local_modules/app/public/stylesheets/lib/mapbox-gl-js'
      },
      worldGeoJson: {
        expand: true,
        cwd: 'bower_components/world.geo.json',
        src: 'countries.geo.json',
        dest: 'local_modules/app/public/data/lib/world.geo.json'
      }
    },

    sass: {
      bootstrap: {
        options: {
          // sourceMap: true
        },
        files: {
          'local_modules/app/public/stylesheets/base/bootstrap.css': 'local_modules/app/public/stylesheets/scss/bootstrap.scss'
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
          // require('postcss-opacity')(),
          // require('pleeease-filters')(),
          // require('css-mqpacker')(),
          require('autoprefixer')({
            browsers: ['> 1%', 'IE 9', 'IE 10', 'IE 11'],
            remove: false
          }),
          // require('cssnano')({
          //   autoprefixer: false,
          //   reduceTransforms: false,
          //   discardUnused: false,
          //   zindex: false
          // })
        ]
      },
      dist: {
        src: 'local_modules/app/public/stylesheets/style.css',
        dest: 'local_modules/app/public/stylesheets/style.min.css'
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
