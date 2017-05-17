module.exports = function(grunt) {
    grunt.initConfig({
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
                    {expand: true, cwd: 'public/', src: ['js/popup.js', 'js/api.js'], dest: 'build/'}
                ]
            }
        }
    });

    // load grunt tasks:
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-contrib-watch');

    // register grunt tasks:
    grunt.registerTask('build', ['copy']);
    grunt.registerTask('build-dev', ['copy:dev']);
    grunt.registerTask('default', ['build']);
};
