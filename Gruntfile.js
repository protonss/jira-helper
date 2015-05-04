module.exports = function(grunt) {
  "use strict";

  grunt.initConfig({
    package: grunt.file.readJSON("package.json"),
    cssmin: {
      dist: {
        files: [{
          expand: true,
          cwd: "app/styles/css",
          src: ["*.css", "!*.min.css"],
          dest: "dist/styles/css",
          ext: ".min.css"
        }]
      }
    },
    copy: {
      images: {
        expand: true,
        cwd: "app/styles/images/",
        src: "**",
        dest: "dist/styles/images/",
        flatten: true,
        filter: "isFile"
      },
      main: {
        files: [{
          src: "app/manifest.json",
          dest: "dist/manifest.json"
        }]
      }
    },
    uglify: {
      options: {
        mangle: false,
        compress: {
          drop_console: true
        },
        banner: "/*! <%= package.name %> - v<%= package.version %> */"
      },
      dist: {
        options: {
          sourceMap: true,
          sourceMapName: "dist/scripts/main.min.js.map"
        },
        files: {
          "dist/scripts/main.min.js": [
            "bower_components/jquery/jquery.min.js",
            "bower_components/jquery.balloon.js/jquery.balloon.min.js",
            "bower_components/highcharts/highcharts.js",
            "app/scripts/inject.js"
          ]
        }
      }
    },
    watch: {
      json: {
        files: [
          "app/manifest.json"
        ],
        tasks: [
          "copy"
        ]
      },
      js: {
        files: [
          "app/scripts/**/*.js"
        ],
        tasks: [
          "uglify"
        ]
      },
      css: {
        files: [
          "app/styles/css"
        ],
        tasks: [
          "cssmin"
        ]
      },
      grunt: {
        files: [
          "Gruntfile.js"
        ],
        tasks: [
          "jshint"
        ]
      }
    }
  });

  grunt.loadNpmTasks("grunt-contrib-cssmin");
  grunt.loadNpmTasks("grunt-contrib-copy");
  grunt.loadNpmTasks("grunt-contrib-uglify");
  grunt.loadNpmTasks("grunt-contrib-watch");

  grunt.registerTask("install", ["build"]);
  grunt.registerTask("build", ["copy", "cssmin", "uglify"]);
  grunt.registerTask("run", ["watch"]);

  grunt.registerTask("default", ["install"]);
};
