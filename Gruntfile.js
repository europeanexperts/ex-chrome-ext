module.exports = function(grunt) {
    function getBuildName() {
        var now = new Date();
        var dateStr = grunt.template.date(now, 'ddmmyy');
        var version = grunt.option('ver') || '1.0';
        var sha = (grunt.option('sha')) ? 'SHA' + grunt.option('sha') : '';
        var name;

        name = ['build_full', 'v1.'+version, dateStr, sha + '.zip'].join('_');
        console.log('>>> name', name);

        return name;
    }

    grunt.initConfig({
        watch: {
            scripts: {
                files: ['public/**/*'],
                tasks: ['clear', 'copy:dev']
            }
        },
        copy: {
            main: {
                files: [
                    {expand: true, src: ['manifest.json', 'icon.png'], dest: 'build/'},
                    {expand: true, cwd: 'public/', src: ['popup.html'], dest: 'build/'},
                    {expand: true, cwd: 'public/', src: ['js/**', 'css/**', 'fonts/**', 'img/**'], dest: 'build/'}
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
    grunt.registerTask('build', ['copy:main', 'compress']);
    grunt.registerTask('build-dev', ['copy:dev']);
    grunt.registerTask('default', ['build']);
};
