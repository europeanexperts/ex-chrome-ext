module.exports = function(grunt) {
    function getBuildName() {
        var now = new Date();
        var dateStr = grunt.template.date(now, 'ddmmyy');
        var version = grunt.option('ver') || '1.0';
        var name;

        name = ['build_simple', 'v2.'+version, dateStr + '.zip'].join('_');
        console.log('>>> name', name);

        return name;
    }

    grunt.initConfig({
        watch: {
            scripts: {
                //files: ['public/js/*.js'],
                files: ['public/**/*'],
                tasks: ['clear', 'copy:dev']
            }
        },
        copy: {
            main: {
                files: [
                    // includes files within path
                    //{expand: true, cwd: 'public/', src: ['js/libs/**', 'js/popup.js'], dest: 'build/'},
                    {expand: true, src: ['manifest.json', 'icon.png'], dest: 'build/'},
                    {expand: true, cwd: 'public/', src: ['popup.html'], dest: 'build/'},
                    {expand: true, cwd: 'public/', src: ['js/**', 'css/**', 'fonts/**', 'img/**'], dest: 'build/'}

                    // includes files within path and its sub-directories
                    /*{expand: true, src: ['path/!**'], dest: 'dest/'},

                    // makes all src relative to cwd
                    {expand: true, cwd: 'path/', src: ['**'], dest: 'dest/'},

                    // flattens results to a single level*/
                    //{expand: true, flatten: true, src: ['path/**'], dest: 'dest/', filter: 'isFile'},
                ]
            },
            dev: {
                files: [
                    {expand: true, src: ['manifest.json', 'icon.png'], dest: 'build/'},
                    {expand: true, cwd: 'public/', src: ['popup.html'], dest: 'build/'},
                    {expand: true, cwd: 'public/', src: [
                        'js/parser.js',
                        'js/euexContentScript.js',
                        'js/contentScript.js',
                        'js/config.js',
                        'js/api.js',
                        'js/popup.js',
                        'js/background.js'
                    ], dest: 'build/'}
                ]
            }
        },
        compress: {
            main: {
                options: {
                    archive: 'builds/' + getBuildName()
                },
                files: [
                    {src: ['build/**'], dest: 'builds/simple/'}
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
    grunt.registerTask('build', ['copy:main', 'compress']);
    grunt.registerTask('build-dev', ['copy:dev']);
    grunt.registerTask('default', ['build']);
};
