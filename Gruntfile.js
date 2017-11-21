module.exports = function(grunt) {
    function getBuildName() {
        var now = new Date();
        var dateStr = grunt.template.date(now, 'ddmmyy');
        var version = grunt.option('ver') || '1.0';
        var sha = (grunt.option('sha')) ? 'SHA' + grunt.option('sha') : '';
        var name;

        name = ['build_full', 'v2.'+version, dateStr, sha + '.zip'].join('_');
        console.log('>>> name', name);

        return name;
    }

    function getBuildNameSimple() {
      var now = new Date();
      var dateStr = grunt.template.date(now, 'ddmmyy');
      var version = grunt.option('ver') || '1.0';
      var sha = (grunt.option('sha')) ? 'SHA' + grunt.option('sha') : '';
      var name;

      name = ['build_simple', 'v2.'+version, dateStr, sha + '.zip'].join('_');
      console.log('>>> name', name);

      return name;
    }

    grunt.initConfig({
        copy: {
            full: {
                files: [
                    // includes files within path
                    {expand: true, src: ['manifest.json', 'icon.png'], dest: 'build/'},
                    {src: 'public/popup.html', dest: 'build/popup.html'},
                    {expand: true, cwd: 'public/', src: [
                      'js/parser.js',
                      'js/euexContentScript.js',
                      'js/contentScript.js',
                      'js/api.js',
                      'js/popup.js',
                      'js/background.js',
                      'js/options.js',
                      'js/templates.js',
                      'js/libs/**/*',
                      'css/**',
                      'fonts/**',
                      'img/**'
                    ], dest: 'build/'},
                    {
                        src: 'public/js/config.js',
                        dest: 'build/js/config.js'
                    }

                    // includes files within path and its sub-directories
                    /*{expand: true, src: ['path/!**'], dest: 'dest/'},

                    // makes all src relative to cwd
                    {expand: true, cwd: 'path/', src: ['**'], dest: 'dest/'},

                    // flattens results to a single level*/
                    //{expand: true, flatten: true, src: ['path/**'], dest: 'dest/', filter: 'isFile'},
                ]
            },
            simple: {
                files: [
                    {expand: true, src: ['manifest.json', 'icon.png'], dest: 'build/'},
                    {src: 'public/popupSimple.html', dest: 'build/popup.html'},
                    {expand: true, cwd: 'public/', src: [
                      'js/parser.js',
                      'js/euexContentScript.js',
                      'js/contentScript.js',
                      'js/api.js',
                      'js/popup.js',
                      'js/background.js',
                      'js/options.js',
                      'js/templates.js',
                      'js/libs/**/*',
                      'css/**',
                      'fonts/**',
                      'img/**'
                    ], dest: 'build/'},
                    {
                      src: 'public/js/configSimple.js',
                      dest: 'build/js/config.js'
                    }
                ]
            }
        },
        compress: {
            full: {
                options: {
                    archive: 'builds/' + getBuildName()
                },
                files: [
                    {src: ['build/**'], dest: ''}
                ]
            },
            simple: {
              options: {
                archive: 'builds/' + getBuildNameSimple()
              },
              files: [
                {src: ['build/**'], dest: ''}
              ]
            }
        }
    });

    // load grunt tasks:
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-clear');
    grunt.loadNpmTasks('grunt-template');
    grunt.loadNpmTasks('grunt-contrib-compress');

    // register grunt tasks:
    grunt.registerTask('build', ['copy:full', 'compress:full']);
    grunt.registerTask('build-simple', ['copy:simple', 'compress:simple']);
    grunt.registerTask('default', ['build']);
};
